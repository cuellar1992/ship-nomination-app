const mongoose = require('mongoose');

const OtherJobSchema = new mongoose.Schema({
  // Descripción del trabajo adicional
  jobDescription: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },

  // Fecha de operación
  operationDate: {
    type: Date,
    required: true
  },

  // Información del sampler asignado
  samplerName: {
    type: String,
    required: true,
    trim: true
  },

  samplerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Sampler',
    required: false
  },

  // Turno de trabajo
  shift: {
    startTime: {
      type: Date
    },
    endTime: {
      type: Date
    },
    hours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24
    }
  },

  // Estado del trabajo
  status: {
    type: String,
    enum: ['confirmed', 'completed'],
    default: 'confirmed'
  },

  // Terminal (por defecto "Other" para distinguir de operaciones normales)
  terminal: {
    type: String,
    default: 'Other'
  }

}, {
  timestamps: true // Añade createdAt y updatedAt automáticamente
});

// Índices para optimizar consultas
OtherJobSchema.index({ operationDate: 1, samplerId: 1 });
OtherJobSchema.index({ operationDate: -1 }); // Para ordenamiento por fecha
OtherJobSchema.index({ samplerName: 1 }); // Para filtros por sampler
OtherJobSchema.index({ status: 1 }); // Para filtros por estado

// Método virtual para calcular si debería estar completado
OtherJobSchema.virtual('shouldBeCompleted').get(function() {
  if (this.status === 'completed') return false;
  if (!this.shift?.endTime) return false;
  
  const now = new Date();
  return now > this.shift.endTime;
});

// Método de instancia para validar horas
OtherJobSchema.methods.validateHours = function() {
  if (!this.shift?.startTime || !this.shift?.endTime) {
    return { isValid: false, message: 'Start and end times are required' };
  }

  const diffMs = this.shift.endTime - this.shift.startTime;
  if (diffMs <= 0) {
    return { isValid: false, message: 'End time must be after start time' };
  }

  const hours = diffMs / (1000 * 60 * 60);
  if (hours > 24) {
    return { isValid: false, message: 'Shift cannot exceed 24 hours' };
  }

  return { isValid: true, hours: Math.round(hours * 100) / 100 };
};

// Pre-save middleware para calcular horas automáticamente
OtherJobSchema.pre('save', function(next) {
  if (this.shift?.startTime && this.shift?.endTime) {
    const validation = this.validateHours();
    if (validation.isValid) {
      this.shift.hours = validation.hours;
    }
  }
  next();
});

module.exports = mongoose.model('OtherJob', OtherJobSchema);
