import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { api } from '../lib/api.js';
import socket from '../lib/socket.js';

const QueueContext = createContext(null);

export const QueueProvider = ({ children }) => {
  const [salonConfig, setSalonConfig] = useState({
    salonNameEn: 'Studio Kashi Salon',
    salonNameGu: 'સ્ટુડિયો કાશી સલૂન',
    openTime: '09:00',
    closeTime: '21:00',
    isQueueOpen: true,
  });

  const [barbers, setBarbers] = useState([]);
  const [services, setServices] = useState([]);
  const [waitingTickets, setWaitingTickets] = useState([]);
  const [calledTickets, setCalledTickets] = useState([]);
  const [inChairTickets, setInChairTickets] = useState([]);
  const [upNextTop5, setUpNextTop5] = useState([]);
  const [todayStats, setTodayStats] = useState({
    servedCount: 0,
    avgWaitMin: 0,
    noShowCount: 0,
    waitingCount: 0,
  });
  const [onlineStatus, setOnlineStatus] = useState({
    isOpen: true,
    reason: 'open',
    closeTimeFormatted: '9:00 PM',
  });

  const [isConnected, setIsConnected] = useState(socket.connected);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Apply state snapshot to React memory
  const applyQueueSnapshot = useCallback((data) => {
    if (!data) return;
    if (data.salonConfig) setSalonConfig(data.salonConfig);
    if (data.barbers) setBarbers(data.barbers);
    if (data.services) setServices(data.services);
    if (data.waitingTickets) setWaitingTickets(data.waitingTickets);
    if (data.calledTickets) setCalledTickets(data.calledTickets);
    if (data.inChairTickets) setInChairTickets(data.inChairTickets);
    if (data.upNextTop5) setUpNextTop5(data.upNextTop5);
    if (data.todayStats) setTodayStats(data.todayStats);
    if (data.onlineStatus) setOnlineStatus(data.onlineStatus);
  }, []);

  // Fetch initial queue state and service catalog
  const fetchInitialState = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      // Parallel fetch for queue snapshot and service catalog
      const [queueRes, bootstrapRes] = await Promise.all([
        api.get('/queue/state'),
        api.get('/bootstrap').catch(() => ({ data: {} })),
      ]);

      applyQueueSnapshot(queueRes.data);

      if (bootstrapRes.data?.services) {
        setServices(bootstrapRes.data.services);
      }
    } catch (err) {
      console.error('[QueueContext] Failed to load initial state:', err);
      setError(err.message || 'Failed to connect to queue server');
    } finally {
      setLoading(false);
    }
  }, [applyQueueSnapshot]);

  useEffect(() => {
    fetchInitialState();

    const handleConnect = () => setIsConnected(true);
    const handleDisconnect = () => setIsConnected(false);
    const handleQueueUpdated = (snapshot) => {
      applyQueueSnapshot(snapshot);
    };

    socket.on('connect', handleConnect);
    socket.on('disconnect', handleDisconnect);
    socket.on('queue:updated', handleQueueUpdated);

    return () => {
      socket.off('connect', handleConnect);
      socket.off('disconnect', handleDisconnect);
      socket.off('queue:updated', handleQueueUpdated);
    };
  }, [fetchInitialState, applyQueueSnapshot]);

  /**
   * Submits an online customer check-in request
   */
  const joinOnline = async ({ customerName, phone, serviceIds, preferredBarber = 'any' }) => {
    const res = await api.post('/queue/join', {
      customerName,
      phone,
      serviceIds,
      preferredBarber,
    });
    return res.data; // { ticket, isExisting }
  };

  const value = {
    salonConfig,
    barbers,
    services,
    waitingTickets,
    calledTickets,
    inChairTickets,
    upNextTop5,
    todayStats,
    onlineStatus,
    isConnected,
    loading,
    error,
    joinOnline,
    refreshQueue: fetchInitialState,
  };

  return <QueueContext.Provider value={value}>{children}</QueueContext.Provider>;
};

export const useQueue = () => {
  const context = useContext(QueueContext);
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider');
  }
  return context;
};

export default QueueContext;
