/**
 * PASO 1: Modelo SamplingRoster - MongoDB Schema
 * Archivo: backend/models/SamplingRoster.js
 */

const mongoose = require('mongoose');

const SamplingRosterSchema = new mongoose.Schema({
  // Referencia al Ship Nomination
  shipNomination: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShipNomination',
    required: true,    
  },

  // Información básica del vessel (desnormalizada para performance)
  vesselName: {
    type: String,
    required: true,
    trim: true
  },

  amspecRef: {
    type: String,
    required: true,
    trim: true
  },

  // Tiempos principales
  startDischarge: {
    type: Date,
    required: true
  },

  etcTime: {
    type: Date,
    required: true
  },

  dischargeTimeHours: {
    type: Number,
    required: true,
    min: 1,
    max: 200 // Límite razonable
  },

  // Office Sampling (6 horas previas)
  officeSampling: {
    sampler: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sampler',
        required: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      }
    },
    startTime: {
      type: Date,
      required: true
    },
    finishTime: {
      type: Date,
      required: true
    },
    hours: {
      type: Number,
      required: true,
      default: 6
    }
  },

  // Line Sampling Schedule (array de turnos)
  lineSampling: [{
    sampler: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Sampler',
        required: true
      },
      name: {
        type: String,
        required: true,
        trim: true
      }
    },
    startTime: {
      type: Date,
      required: true
    },
    finishTime: {
      type: Date,
      required: true
    },
    hours: {
      type: Number,
      required: true,
      min: 1,
      max: 12
    },
    blockType: {
      type: String,
      enum: ['day', 'night'],
      required: true
    },
    turnOrder: {
      type: Number,
      required: true,
      min: 0
    }
  }],

  // Estado del roster
  status: {
    type: String,
    enum: ['draft', 'active', 'completed', 'cancelled'],
    default: 'draft'
  },

  // Metadatos
  totalSamplers: {
    type: Number,
    required: true,
    min: 1
  },

  totalTurns: {
    type: Number,
    required: true,
    min: 1
  },

  // Auditoría
  createdBy: {
    type: String,
    required: true,
    default: 'system'
  },

  lastModifiedBy: {
    type: String,
    required: true,
    default: 'system'
  },

  version: {
    type: Number,
    default: 1
  }

}, {
  timestamps: true, // Crea createdAt y updatedAt automáticamente
  collection: 'sampling_rosters'
});

// ✅ ÍNDICES PARA PERFORMANCE
SamplingRosterSchema.index({ shipNomination: 1 }); // Búsqueda por ship nomination
SamplingRosterSchema.index({ vesselName: 1 }); // Búsqueda por vessel
SamplingRosterSchema.index({ status: 1 }); // Filtro por estado
SamplingRosterSchema.index({ createdAt: -1 }); // Ordenamiento por fecha
SamplingRosterSchema.index({ 'officeSampling.sampler.id': 1 }); // Búsqueda por sampler
SamplingRosterSchema.index({ 'lineSampling.sampler.id': 1 }); // Búsqueda por sampler

// ✅ MÉTODOS VIRTUALES
SamplingRosterSchema.virtual('totalHours').get(function() {
  return this.officeSampling.hours + 
         this.lineSampling.reduce((total, turn) => total + turn.hours, 0);
});

// ✅ MÉTODOS DE INSTANCIA
SamplingRosterSchema.methods.validateSamplerHours = function(samplerId) {
  let totalHours = 0;

  // Contar horas en Office Sampling
  if (this.officeSampling.sampler.id.equals(samplerId)) {
    totalHours += this.officeSampling.hours;
  }

  // Contar horas en Line Sampling
  this.lineSampling.forEach(turn => {
    if (turn.sampler.id.equals(samplerId)) {
      totalHours += turn.hours;
    }
  });

  return {
    isValid: totalHours <= 12,
    totalHours: totalHours
  };
};

SamplingRosterSchema.methods.getSamplerWorkload = function() {
  const workload = {};

  // Office Sampling
  const officeSamplerId = this.officeSampling.sampler.id.toString();
  workload[officeSamplerId] = {
    name: this.officeSampling.sampler.name,
    hours: this.officeSampling.hours,
    turns: 1
  };

  // Line Sampling
  this.lineSampling.forEach(turn => {
    const samplerId = turn.sampler.id.toString();
    if (workload[samplerId]) {
      workload[samplerId].hours += turn.hours;
      workload[samplerId].turns += 1;
    } else {
      workload[samplerId] = {
        name: turn.sampler.name,
        hours: turn.hours,
        turns: 1
      };
    }
  });

  return workload;
};

// ✅ MÉTODOS ESTÁTICOS
SamplingRosterSchema.statics.findByShipNomination = function(nominationId) {
  return this.findOne({ shipNomination: nominationId })
             .populate('shipNomination')
             .populate('officeSampling.sampler.id')
             .populate('lineSampling.sampler.id');
};

SamplingRosterSchema.statics.findActiveRosters = function() {
  return this.find({ status: 'active' })
             .sort({ createdAt: -1 })
             .populate('shipNomination');
};

// ✅ MIDDLEWARE PRE-SAVE
SamplingRosterSchema.pre('save', function(next) {
  // Actualizar metadatos antes de guardar
  this.totalTurns = this.lineSampling.length;
  
  // Calcular samplers únicos
  const uniqueSamplers = new Set();
  uniqueSamplers.add(this.officeSampling.sampler.id.toString());
  this.lineSampling.forEach(turn => {
    uniqueSamplers.add(turn.sampler.id.toString());
  });
  this.totalSamplers = uniqueSamplers.size;

  // Incrementar versión en updates
  if (!this.isNew) {
    this.version += 1;
  }

  next();
});

// ✅ MIDDLEWARE POST-SAVE
SamplingRosterSchema.post('save', function(doc) {
  console.log(`SamplingRoster saved: ${doc.vesselName} (${doc.totalHours} hours)`);
});

// ✅ VALIDACIONES PERSONALIZADAS
SamplingRosterSchema.path('dischargeTimeHours').validate(function(value) {
  return value > 6; // Debe ser mayor que Office Sampling
}, 'Discharge time must be greater than 6 hours');

SamplingRosterSchema.path('etcTime').validate(function(value) {
  return value > this.startDischarge;
}, 'ETC must be after Start Discharge time');

// Validar que no hay overlaps en turnos
SamplingRosterSchema.path('lineSampling').validate(function(turns) {
  for (let i = 0; i < turns.length - 1; i++) {
    const currentTurn = turns[i];
    const nextTurn = turns[i + 1];
    
    if (currentTurn.finishTime > nextTurn.startTime) {
      return false; // Overlap detectado
    }
  }
  return true;
}, 'Line sampling turns cannot overlap');

module.exports = mongoose.model('SamplingRoster', SamplingRosterSchema);