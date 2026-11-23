import { Service, Barber, QueueTicket, SalonConfig, DailyCounter } from '../models/index.js';
import { getIstDateKey, evaluateOnlineJoiningStatus } from '../utils/salonTime.js';
import { AppError } from '../utils/AppError.js';

/**
 * Validates forward-only state transitions according to docs/03-flows-rules.md
 */
const ALLOWED_TRANSITIONS = {
  waiting: ['called', 'cancelled'],
  called: ['in_chair', 'no_show'],
  in_chair: ['done'],
  done: [],
  cancelled: [],
  no_show: [],
};

export const assertValidStateTransition = (currentStatus, targetStatus) => {
  const allowed = ALLOWED_TRANSITIONS[currentStatus] || [];
  if (!allowed.includes(targetStatus)) {
    throw new AppError(
      400,
      `Invalid state transition: Cannot move ticket from '${currentStatus}' to '${targetStatus}'. Allowed next states: [${allowed.join(', ')}]`
    );
  }
};

/**
 * Customer / Walk-In Queue Registration
 */
export const joinQueue = async ({
  customerName,
  phone,
  serviceIds,
  preferredBarber = 'any',
  source = 'online',
}) => {
  // 1. Validate customer name
  const trimmedName = String(customerName || '').trim();
  if (trimmedName.length < 2) {
    throw new AppError(400, 'Customer name must be at least 2 characters long');
  }

  // 2. Validate phone number (strictly 10 digits)
  const trimmedPhone = String(phone || '').trim();
  if (!/^\d{10}$/.test(trimmedPhone)) {
    throw new AppError(400, 'Phone must be a valid 10-digit Indian mobile number');
  }

  // 3. Validate service selection (1 to 3 items)
  if (!Array.isArray(serviceIds) || serviceIds.length < 1 || serviceIds.length > 3) {
    throw new AppError(400, 'You must select between 1 and 3 services');
  }

  // Fetch services from DB
  const dbServices = await Service.find({
    _id: { $in: serviceIds },
    isActive: true,
  });

  if (dbServices.length !== serviceIds.length) {
    throw new AppError(400, 'One or more selected services are invalid or currently inactive');
  }

  // Compute duration and price from source of truth DB records
  let totalDurationMin = 0;
  let totalPrice = 0;
  const serviceSnapshots = dbServices.map((svc) => {
    totalDurationMin += svc.durationMin;
    totalPrice += svc.price;
    return {
      serviceId: svc._id,
      nameEn: svc.nameEn,
      nameGu: svc.nameGu,
      durationMin: svc.durationMin,
      price: svc.price,
    };
  });

  const dateKey = getIstDateKey();

  // 4. Duplicate Active Phone Guard
  // Query today's tickets for this phone with active status
  const existingActiveTicket = await QueueTicket.findOne({
    dateKey,
    phone: trimmedPhone,
    status: { $in: ['waiting', 'called', 'in_chair'] },
  });

  if (existingActiveTicket) {
    return {
      ticket: existingActiveTicket,
      isExisting: true,
    };
  }

  // 5. Online Cutoff Guard (walk-ins are allowed anytime salon is physically operating)
  const salonConfig = (await SalonConfig.findOne({ key: 'default' })) || (await SalonConfig.create({ key: 'default' }));
  if (source === 'online') {
    const onlineStatus = evaluateOnlineJoiningStatus(salonConfig);
    if (!onlineStatus.isOpen) {
      throw new AppError(
        403,
        `Online queue registration is currently closed (${onlineStatus.reason}). Closing time: ${onlineStatus.closeTimeFormatted}`,
        { reason: onlineStatus.reason }
      );
    }
  }

  // 6. Validate preferred barber
  const normalizedBarber = String(preferredBarber || 'any').toLowerCase().trim();
  if (normalizedBarber !== 'any') {
    const barberExists = await Barber.findOne({ slug: normalizedBarber, onDuty: true });
    if (!barberExists) {
      throw new AppError(400, `Selected stylist '${normalizedBarber}' is not currently on duty or does not exist`);
    }
  }

  // 7. Atomic daily token generation
  const { sequence, token } = await DailyCounter.getNextToken(dateKey);

  // 8. Create and persist ticket
  const ticket = await QueueTicket.create({
    dateKey,
    sequence,
    token,
    customerName: trimmedName,
    phone: trimmedPhone,
    services: serviceSnapshots,
    totalDurationMin,
    totalPrice,
    preferredBarber: normalizedBarber,
    source: source === 'walkin' ? 'walkin' : 'online',
    status: 'waiting',
    joinedAt: new Date(),
  });

  return {
    ticket,
    isExisting: false,
  };
};

/**
 * Barber Matching: Call next customer in line eligible for this barber
 */
export const callNextForBarber = async (barberSlug) => {
  const normalizedSlug = String(barberSlug || '').toLowerCase().trim();
  const barber = await Barber.findOne({ slug: normalizedSlug, onDuty: true });

  if (!barber) {
    throw new AppError(404, `Barber '${normalizedSlug}' not found or not on duty`);
  }

  if (barber.status !== 'available') {
    throw new AppError(400, `Barber '${barber.name}' is currently ${barber.status} and cannot call another customer`);
  }

  const dateKey = getIstDateKey();

  // Confirm no leftover active ticket assigned to this barber
  const activeExisting = await QueueTicket.findOne({
    dateKey,
    assignedBarber: normalizedSlug,
    status: { $in: ['called', 'in_chair'] },
  });

  if (activeExisting) {
    throw new AppError(400, `Barber '${barber.name}' already has an active customer (${activeExisting.token})`);
  }

  // Query next eligible ticket:
  // Strict Preference Rule: If preferredBarber is specific (e.g. 'ravi'), only 'ravi' can call them.
  // Barber can call tickets with preferredBarber === barberSlug OR preferredBarber === 'any'.
  const nextTicket = await QueueTicket.findOne({
    dateKey,
    status: 'waiting',
    preferredBarber: { $in: [normalizedSlug, 'any'] },
  }).sort({ sequence: 1 });

  if (!nextTicket) {
    throw new AppError(404, `No eligible customers waiting for barber '${barber.name}'`);
  }

  // State Transition: waiting -> called
  assertValidStateTransition(nextTicket.status, 'called');
  nextTicket.status = 'called';
  nextTicket.assignedBarber = normalizedSlug;
  nextTicket.calledAt = new Date();
  await nextTicket.save();

  // Update barber state to busy
  barber.status = 'busy';
  barber.currentTicketId = nextTicket._id;
  await barber.save();

  return {
    ticket: nextTicket,
    barber,
  };
};

/**
 * Transition ticket from called to in_chair
 */
export const startTicketForBarber = async (barberSlug) => {
  const normalizedSlug = String(barberSlug || '').toLowerCase().trim();
  const barber = await Barber.findOne({ slug: normalizedSlug, onDuty: true });

  if (!barber) {
    throw new AppError(404, `Barber '${normalizedSlug}' not found or not on duty`);
  }

  const dateKey = getIstDateKey();
  const ticket = await QueueTicket.findOne({
    dateKey,
    assignedBarber: normalizedSlug,
    status: 'called',
  });

  if (!ticket) {
    throw new AppError(400, `No called ticket ready to be seated in chair for barber '${barber.name}'`);
  }

  assertValidStateTransition(ticket.status, 'in_chair');
  ticket.status = 'in_chair';
  ticket.startedAt = new Date();
  await ticket.save();

  barber.status = 'busy';
  barber.currentTicketId = ticket._id;
  await barber.save();

  return { ticket, barber };
};

/**
 * Complete ticket and free barber chair
 */
export const completeTicketForBarber = async (barberSlug) => {
  const normalizedSlug = String(barberSlug || '').toLowerCase().trim();
  const barber = await Barber.findOne({ slug: normalizedSlug });

  if (!barber) {
    throw new AppError(404, `Barber '${normalizedSlug}' not found`);
  }

  const dateKey = getIstDateKey();
  const ticket = await QueueTicket.findOne({
    dateKey,
    assignedBarber: normalizedSlug,
    status: 'in_chair',
  });

  if (!ticket) {
    throw new AppError(400, `No active service in chair to complete for barber '${barber.name}'`);
  }

  assertValidStateTransition(ticket.status, 'done');
  ticket.status = 'done';
  ticket.completedAt = new Date();
  await ticket.save();

  // Free barber
  barber.status = 'available';
  barber.currentTicketId = null;
  await barber.save();

  return { ticket, barber };
};

/**
 * Barber break toggle
 */
export const setBarberBreakStatus = async (barberSlug, targetStatus) => {
  const normalizedSlug = String(barberSlug || '').toLowerCase().trim();
  if (!['available', 'on_break'].includes(targetStatus)) {
    throw new AppError(400, "Target status must be either 'available' or 'on_break'");
  }

  const barber = await Barber.findOne({ slug: normalizedSlug });
  if (!barber) {
    throw new AppError(404, `Barber '${normalizedSlug}' not found`);
  }

  if (barber.status === 'busy' || barber.currentTicketId) {
    throw new AppError(400, 'Cannot change break status while an active customer is assigned or seated');
  }

  barber.status = targetStatus;
  await barber.save();

  return barber;
};

/**
 * Cancel ticket (Customer self-cancel or front-desk cancel)
 */
export const cancelTicket = async (ticketId) => {
  const ticket = await QueueTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  assertValidStateTransition(ticket.status, 'cancelled');
  ticket.status = 'cancelled';
  ticket.cancelledAt = new Date();
  await ticket.save();

  return ticket;
};

/**
 * Mark ticket as No-Show (Allowed only when status === 'called')
 */
export const markTicketNoShow = async (ticketId) => {
  const ticket = await QueueTicket.findById(ticketId);
  if (!ticket) {
    throw new AppError(404, 'Ticket not found');
  }

  assertValidStateTransition(ticket.status, 'no_show');
  ticket.status = 'no_show';
  await ticket.save();

  // Free the assigned barber
  if (ticket.assignedBarber) {
    await Barber.findOneAndUpdate(
      { slug: ticket.assignedBarber },
      { $set: { status: 'available', currentTicketId: null } }
    );
  }

  return ticket;
};

/**
 * Calculates live queue positions, dynamic wait times, top 5 up next, and operational stats
 */
export const getLiveQueueSnapshot = async () => {
  const dateKey = getIstDateKey();

  const [salonConfig, barbers, tickets, services] = await Promise.all([
    SalonConfig.findOne({ key: 'default' }).lean() || {},
    Barber.find({ onDuty: true }).populate('currentTicketId').sort({ name: 1 }).lean(),
    QueueTicket.find({ dateKey }).sort({ sequence: 1 }).lean(),
    Service.find({ isActive: true }).sort({ sortOrder: 1, nameEn: 1 }).lean(),
  ]);

  const waitingTickets = tickets.filter((t) => t.status === 'waiting');
  const calledTickets = tickets.filter((t) => t.status === 'called');
  const inChairTickets = tickets.filter((t) => t.status === 'in_chair');
  const doneTickets = tickets.filter((t) => t.status === 'done');
  const noShowTickets = tickets.filter((t) => t.status === 'no_show');

  // Count active working barbers (on duty and not on break)
  const workingBarbers = barbers.filter((b) => b.onDuty && b.status !== 'on_break').length;

  // Enrich waiting tickets with exact position & dynamic wait estimate
  const enrichedWaitingTickets = waitingTickets.map((ticket, idx) => {
    const position = idx + 1;

    // Tickets strictly ahead in queue
    const ticketsAhead = waitingTickets.filter((t) => t.sequence < ticket.sequence);

    let minutesAhead = 0;
    if (ticket.preferredBarber !== 'any') {
      // Competing for specific barber: only count tickets ahead wanting that barber or 'any'
      const competing = ticketsAhead.filter(
        (t) => t.preferredBarber === ticket.preferredBarber || t.preferredBarber === 'any'
      );
      minutesAhead = competing.reduce((acc, t) => acc + (t.totalDurationMin || 0), 0);
    } else {
      // General pool
      minutesAhead = ticketsAhead.reduce((acc, t) => acc + (t.totalDurationMin || 0), 0);
    }

    const divisor = ticket.preferredBarber === 'any' ? Math.max(workingBarbers, 1) : 1;
    const estimatedWaitMin = Math.ceil(minutesAhead / divisor);

    return {
      ...ticket,
      position,
      estimatedWaitMin,
      isApproaching: position === 2,
    };
  });

  // Top 5 up next for TV Display
  const upNextTop5 = enrichedWaitingTickets.slice(0, 5);

  // Compute average wait time for completed tickets today
  let totalServedWaitMins = 0;
  let validServedCount = 0;
  for (const doneTicket of doneTickets) {
    if (doneTicket.startedAt && doneTicket.joinedAt) {
      const waitMs = new Date(doneTicket.startedAt) - new Date(doneTicket.joinedAt);
      const waitMin = Math.max(0, Math.round(waitMs / (1000 * 60)));
      totalServedWaitMins += waitMin;
      validServedCount++;
    }
  }
  const avgWaitMin = validServedCount > 0 ? Math.round(totalServedWaitMins / validServedCount) : 0;

  const onlineStatus = evaluateOnlineJoiningStatus(salonConfig);

  return {
    dateKey,
    salonConfig,
    barbers,
    services,
    waitingTickets: enrichedWaitingTickets,
    calledTickets,
    inChairTickets,
    upNextTop5,
    todayStats: {
      servedCount: doneTickets.length,
      avgWaitMin,
      noShowCount: noShowTickets.length,
      waitingCount: waitingTickets.length,
    },
    onlineStatus,
    serverTime: new Date().toISOString(),
  };
};

/**
 * Retrieves a single ticket by Mongo ID or Token and enriches with position & wait estimates
 */
export const getEnrichedTicketById = async (idOrToken) => {
  const query = idOrToken.match(/^[0-9a-fA-F]{24}$/)
    ? { _id: idOrToken }
    : { token: idOrToken.toUpperCase() };

  const ticket = await QueueTicket.findOne(query).lean();
  if (!ticket) {
    throw new AppError(404, `Ticket '${idOrToken}' not found`);
  }

  // Fetch barber info
  let preferredBarberInfo = null;
  let assignedBarberInfo = null;

  if (ticket.preferredBarber && ticket.preferredBarber !== 'any') {
    preferredBarberInfo = await Barber.findOne({ slug: ticket.preferredBarber })
      .select('name slug specialtyEn specialtyGu status')
      .lean();
  }

  if (ticket.assignedBarber) {
    assignedBarberInfo = await Barber.findOne({ slug: ticket.assignedBarber })
      .select('name slug specialtyEn specialtyGu status')
      .lean();
  }

  let position = null;
  let estimatedWaitMin = null;
  let isApproaching = false;

  if (ticket.status === 'waiting') {
    const dateKey = ticket.dateKey || getIstDateKey();
    const waitingTickets = await QueueTicket.find({
      dateKey,
      status: 'waiting',
    })
      .sort({ sequence: 1 })
      .lean();

    const idx = waitingTickets.findIndex((t) => String(t._id) === String(ticket._id));
    if (idx !== -1) {
      position = idx + 1;
      isApproaching = position === 2;

      const barbers = await Barber.find({ onDuty: true }).lean();
      const workingBarbers = barbers.filter((b) => b.onDuty && b.status !== 'on_break').length;

      const ticketsAhead = waitingTickets.slice(0, idx);
      let minutesAhead = 0;
      if (ticket.preferredBarber !== 'any') {
        const competing = ticketsAhead.filter(
          (t) => t.preferredBarber === ticket.preferredBarber || t.preferredBarber === 'any'
        );
        minutesAhead = competing.reduce((acc, t) => acc + (t.totalDurationMin || 0), 0);
      } else {
        minutesAhead = ticketsAhead.reduce((acc, t) => acc + (t.totalDurationMin || 0), 0);
      }

      const divisor = ticket.preferredBarber === 'any' ? Math.max(workingBarbers, 1) : 1;
      estimatedWaitMin = Math.ceil(minutesAhead / divisor);
    }
  }

  return {
    ...ticket,
    position,
    estimatedWaitMin,
    isApproaching,
    preferredBarberInfo,
    assignedBarberInfo,
  };
};

export default {
  assertValidStateTransition,
  joinQueue,
  callNextForBarber,
  startTicketForBarber,
  completeTicketForBarber,
  setBarberBreakStatus,
  cancelTicket,
  markTicketNoShow,
  getLiveQueueSnapshot,
  getEnrichedTicketById,
};
