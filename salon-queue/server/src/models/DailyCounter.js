import mongoose from 'mongoose';

const dailyCounterSchema = new mongoose.Schema({
  _id: {
    type: String,
    required: true,
  },
  seq: {
    type: Number,
    default: 0,
  },
});

/**
 * Atomically increments and retrieves the next sequential token for a given dateKey (YYYY-MM-DD).
 * Guarantees zero race conditions during concurrent check-in submissions.
 *
 * @param {string} dateKey - Date string in "YYYY-MM-DD" IST format
 * @returns {Promise<{ sequence: number, token: string }>}
 */
dailyCounterSchema.statics.getNextToken = async function (dateKey) {
  const counterId = `ticket_${dateKey}`;

  const doc = await this.findByIdAndUpdate(
    counterId,
    { $inc: { seq: 1 } },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  return {
    sequence: doc.seq,
    token: `S-${doc.seq}`,
  };
};

export const DailyCounter = mongoose.model('DailyCounter', dailyCounterSchema);
export default DailyCounter;
