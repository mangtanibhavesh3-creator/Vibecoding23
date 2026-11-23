import dotenv from 'dotenv';
import mongoose from 'mongoose';
import { connectDB } from '../config/db.js';
import { Service, Barber, SalonConfig } from '../models/index.js';

dotenv.config();

export const defaultSalonConfig = {
  key: 'default',
  salonNameEn: 'Studio Kashi Salon',
  salonNameGu: 'સ્ટુડિયો કાશી સલૂન',
  openTime: '09:00',
  closeTime: '21:00',
  isQueueOpen: true,
  onlineCutoffMinutes: 30,
};

export const defaultBarbers = [
  {
    name: 'Ravi',
    slug: 'ravi',
    specialtyEn: 'Senior Hair & Fade Specialist',
    specialtyGu: 'સિનિયર હેર અને ફેડ સ્પેશિયાલિસ્ટ',
    status: 'available',
    onDuty: true,
  },
  {
    name: 'Amit',
    slug: 'amit',
    specialtyEn: 'Classic Cuts & Beard Styling',
    specialtyGu: 'ક્લાસિક કટ અને દાઢી સ્ટાઇલિંગ',
    status: 'available',
    onDuty: true,
  },
  {
    name: 'Imran',
    slug: 'imran',
    specialtyEn: 'Hair Spa & Grooming Expert',
    specialtyGu: 'હેર સ્પા અને ગ્રૂમિંગ એક્સપર્ટ',
    status: 'available',
    onDuty: true,
  },
];

export const defaultServices = [
  {
    nameEn: 'Haircut',
    nameGu: 'હેર કટ',
    durationMin: 30,
    price: 150,
    isActive: true,
    sortOrder: 1,
  },
  {
    nameEn: 'Beard Trim & Styling',
    nameGu: 'દાઢી ટ્રિમ અને સ્ટાઇલિંગ',
    durationMin: 15,
    price: 80,
    isActive: true,
    sortOrder: 2,
  },
  {
    nameEn: 'Hair Spa',
    nameGu: 'હેર સ્પા',
    durationMin: 45,
    price: 400,
    isActive: true,
    sortOrder: 3,
  },
  {
    nameEn: 'Relaxing Head Massage',
    nameGu: 'રિલેક્સિંગ હેડ મસાજ',
    durationMin: 20,
    price: 120,
    isActive: true,
    sortOrder: 4,
  },
  {
    nameEn: 'De-Tan Facial Cleanup',
    nameGu: 'ડી-ટેન ફેશિયલ ક્લીનઅપ',
    durationMin: 35,
    price: 350,
    isActive: true,
    sortOrder: 5,
  },
  {
    nameEn: 'Hair Colour & Wash',
    nameGu: 'હેર કલર અને વોશ',
    durationMin: 45,
    price: 500,
    isActive: true,
    sortOrder: 6,
  },
];

/**
 * Idempotent seeder: Seeds default config, barbers, and services without creating duplicates.
 * @param {Object} [options]
 * @param {boolean} [options.force=false] - If true, re-syncs even if collections have existing data.
 */
export const seedDatabase = async ({ force = false } = {}) => {
  try {
    const serviceCount = await Service.countDocuments();
    const barberCount = await Barber.countDocuments();

    // 1. Upsert SalonConfig singleton
    await SalonConfig.findOneAndUpdate(
      { key: 'default' },
      { $setOnInsert: defaultSalonConfig },
      { upsert: true, new: true }
    );

    // 2. Seed Barbers if empty or forced
    if (barberCount === 0 || force) {
      console.log('[Seed] Seeding default barbers...');
      for (const barber of defaultBarbers) {
        await Barber.findOneAndUpdate(
          { slug: barber.slug },
          { $set: barber },
          { upsert: true, new: true }
        );
      }
      console.log(`[Seed] Seeded ${defaultBarbers.length} barbers successfully.`);
    } else {
      console.log(`[Seed] Barbers collection already contains ${barberCount} records.`);
    }

    // 3. Seed Services if empty or forced
    if (serviceCount === 0 || force) {
      console.log('[Seed] Seeding default salon services...');
      for (const service of defaultServices) {
        await Service.findOneAndUpdate(
          { nameEn: service.nameEn },
          { $set: service },
          { upsert: true, new: true }
        );
      }
      console.log(`[Seed] Seeded ${defaultServices.length} services successfully.`);
    } else {
      console.log(`[Seed] Services collection already contains ${serviceCount} records.`);
    }

    return { success: true };
  } catch (error) {
    console.error(`[Seed] Error during seeding: ${error.message}`);
    throw error;
  }
};

// If executed directly as CLI script
const isMainModule = import.meta.url === `file://${process.argv[1]}`;
if (isMainModule) {
  (async () => {
    try {
      console.log('[Seed CLI] Connecting to MongoDB...');
      await connectDB();
      await seedDatabase({ force: true });
      console.log('[Seed CLI] Database seeding completed successfully.');
      process.exit(0);
    } catch (err) {
      console.error('[Seed CLI] Seeding failed:', err);
      process.exit(1);
    }
  })();
}

export default seedDatabase;
