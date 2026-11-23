import mongoose from 'mongoose';

const barberSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Barber name is required'],
      trim: true,
    },
    slug: {
      type: String,
      required: [true, 'Barber slug is required'],
      unique: true,
      lowercase: true,
      trim: true,
    },
    specialtyEn: {
      type: String,
      default: 'Master Stylist',
      trim: true,
    },
    specialtyGu: {
      type: String,
      default: 'માસ્ટર સ્ટાઇલિસ્ટ',
      trim: true,
    },
    status: {
      type: String,
      enum: ['available', 'busy', 'on_break'],
      default: 'available',
    },
    onDuty: {
      type: Boolean,
      default: true,
    },
    currentTicketId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QueueTicket',
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

barberSchema.index({ onDuty: 1, status: 1 });

export const Barber = mongoose.model('Barber', barberSchema);
export default Barber;
