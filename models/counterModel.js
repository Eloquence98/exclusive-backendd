const mongoose = require('mongoose');

const counterSchema = new mongoose.Schema(
  {
    _id: {
      type: String,
      required: true,
    },
    seq: {
      type: Number,
      default: 0,
    },
  },
  { versionKey: false },
);

counterSchema.statics.getNextSequence = async function (idPrefix, dateStr) {
  const counterId = `${idPrefix}-${dateStr}`;

  const counter = await this.findOneAndUpdate(
    { _id: counterId },
    { $inc: { seq: 1 } },
    {
      new: true,
      upsert: true,
    },
  );

  return counter.seq;
};

const Counter = mongoose.model('Counter', counterSchema);

module.exports = Counter;
