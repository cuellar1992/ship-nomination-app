const mongoose = require('mongoose');

const LoadSchema = new mongoose.Schema({
  loadNo: { type: Number, required: true },
  startTime: { type: Date },
  product: { type: String, enum: ['Hyvolt I', 'Hyvolt III'] },
}, { _id: false });

const TruckWorkDaySchema = new mongoose.Schema({
  operationDate: { type: Date, required: true },
  terminal: { type: String, default: 'Quantem' },
  samplerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Sampler', required: false },
  samplerName: { type: String, required: true },
  shift: {
    startTime: { type: Date },
    endTime: { type: Date },
    hours: { type: Number, default: 0 },
  },
  loads: { type: [LoadSchema], default: [] },
  status: { type: String, enum: ['confirmed', 'completed'], default: 'confirmed' },
}, { timestamps: true });

TruckWorkDaySchema.index({ operationDate: 1, samplerId: 1 });

module.exports = mongoose.model('TruckWorkDay', TruckWorkDaySchema);


