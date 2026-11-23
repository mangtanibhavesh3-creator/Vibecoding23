import mongoose from 'mongoose';

const serviceSchema = new mongoose.Schema(
  {
    nameEn: {
      type: String,
      required: [true, 'English service name is required'],
      trim: true,
    },
    nameGu: {
      type: String,
      required: [true, 'Gujarati service name is required'],
      trim: true,
    },
    durationMin: {
      type: Number,
      required: [true, 'Duration in minutes is required'],
      min: [5, 'Duration must be at least 5 minutes'],
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    isActive: {
      type: Boolean,
      default: true,
    },
    sortOrder: {
      type: Number,
      default: 0,
    },
  },
  {
    timestamps: true,
  }
);

serviceSchema.index({ isActive: 1, sortOrder: 1 });

export const Service = mongoose.model('Service', serviceSchema);
export default Service;
