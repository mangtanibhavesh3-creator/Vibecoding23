import mongoose from 'mongoose';

const salonConfigSchema = new mongoose.Schema(
  {
    key: {
      type: String,
      default: 'default',
      unique: true,
      trim: true,
    },
    salonNameEn: {
      type: String,
      default: 'Studio Kashi Salon',
      trim: true,
    },
    salonNameGu: {
      type: String,
      default: 'સ્ટુડિયો કાશી સલૂન',
      trim: true,
    },
    openTime: {
      type: String,
      default: '09:00',
      trim: true,
    },
    closeTime: {
      type: String,
      default: '21:00',
      trim: true,
    },
    isQueueOpen: {
      type: Boolean,
      default: true,
    },
    onlineCutoffMinutes: {
      type: Number,
      default: 30,
      min: [0, 'Cutoff minutes cannot be negative'],
    },
  },
  {
    timestamps: true,
  }
);

export const SalonConfig = mongoose.model('SalonConfig', salonConfigSchema);
export default SalonConfig;
