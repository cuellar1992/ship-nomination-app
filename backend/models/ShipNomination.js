// backend/models/ShipNomination.js
const mongoose = require("mongoose");

// Función de validación para arrays
function arrayMinLength(arr) {
  return arr && arr.length > 0;
}

const shipNominationSchema = new mongoose.Schema(
  {
    // ========================================
    // CAMPOS HTML REALES DE TU FORMULARIO
    // ========================================

    // Input: vesselName
    vesselName: {
      type: String,
      required: [true, "Vessel name is required"],
      trim: true,
    },

    // ✅ Input: amspecRef - ÚNICO Y REQUERIDO
    amspecRef: {
      type: String,
      required: [true, "AmSpec Reference # is required"],
      unique: true, // ← ÚNICO
      trim: true,
      index: true, // ← ÍNDICE para búsquedas rápidas
    },

    // ✅ Input: clientRef - ÚNICO CUANDO EXISTE
    clientRef: {
      type: String,
      trim: true,
      sparse: true, // ← PERMITE NULL pero ÚNICO cuando existe
      unique: true, // ← ÚNICO
    },

    // ========================================
    // SINGLESELECTS - Almacenar ID y nombre
    // ========================================

    // SingleSelect: agent
    agent: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Agent",
        required: [true, "Agent is required"],
      },
      name: {
        type: String,
        required: true,
      },
    },

    // SingleSelect: terminal
    terminal: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Terminal",
        required: [true, "Terminal is required"],
      },
      name: {
        type: String,
        required: true,
      },
    },

    // SingleSelect: berth
    berth: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Berth",
        required: [true, "Berth is required"],
      },
      name: {
        type: String,
        required: true,
      },
    },

    // SingleSelect: surveyor
    surveyor: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Surveyor",
        required: [true, "Surveyor is required"],
      },
      name: {
        type: String,
        required: true,
      },
    },

    // SingleSelect: sampler
    sampler: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Sampler",
        required: [true, "Sampler is required"],
      },
      name: {
        type: String,
        required: true,
      },
    },

    // SingleSelect: chemist
    chemist: {
      id: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Chemist",
        required: [true, "Chemist is required"],
      },
      name: {
        type: String,
        required: true,
      },
    },

    // ========================================
    // MULTISELECT - Array de objetos
    // ========================================

    // MultiSelect: clientName
    clientName: {
      type: [
        {
          id: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "Client",
            required: true,
          },
          name: {
            type: String,
            required: true,
          },
        },
      ],
      required: true,
      validate: [arrayMinLength, "At least one client is required"],
    },

    // MultiSelect: productTypes
    productTypes: [
      {
        id: {
          type: mongoose.Schema.Types.ObjectId,
          ref: "ProductType",
          required: true,
        },
        name: {
          type: String,
          required: true,
        },
      },
    ],

    // ========================================
    // DATETIMEPICKERS - Fechas
    // ========================================

    // DateTime: pilotOnBoard
    pilotOnBoard: {
      type: Date,
      required: [true, "Pilot on board time is required"],
    },

    // DateTime: etb
    etb: {
      type: Date,
      required: [true, "ETB (Estimated Time of Berthing) is required"],
    },

    // DateTime: etc
    etc: {
      type: Date,
      required: [true, "ETC (Estimated Time of Completion) is required"],
    },

    // ========================================
    // CAMPOS ADICIONALES ÚTILES
    // ========================================

    // ✅ Estado del nomination - Cambiar default a 'confirmed'
    status: {
      type: String,
      enum: ["draft", "confirmed", "in_progress", "completed", "cancelled"],
      default: "confirmed", // ← CAMBIO: default confirmed en lugar de draft
    },

    // Notas adicionales (opcional)
    notes: {
      type: String,
      trim: true,
      maxlength: [1000, "Notes cannot exceed 1000 characters"],
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt automáticamente
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
  }
);

// ========================================
// ✅ ÍNDICES MEJORADOS PARA CONSULTAS Y ÚNICOS
// ========================================
shipNominationSchema.index({ vesselName: 1 });
//shipNominationSchema.index({ amspecRef: 1 });
//shipNominationSchema.index({ clientRef: 1 });
shipNominationSchema.index({ "clientName.name": 1 });
shipNominationSchema.index({ "terminal.name": 1 });
shipNominationSchema.index({ etb: 1 });
shipNominationSchema.index({ status: 1 });
shipNominationSchema.index({ createdAt: -1 });

// ✅ ÍNDICES COMPUESTOS PARA MEJOR PERFORMANCE
shipNominationSchema.index({ vesselName: 1, etb: 1 });
shipNominationSchema.index({ "terminal.name": 1, etb: 1 });
shipNominationSchema.index({ status: 1, etb: 1 });

// ========================================
// CAMPO VIRTUAL PARA MOSTRAR
// ========================================
shipNominationSchema.virtual("displayName").get(function () {
  const etbDate = this.etb
    ? new Date(this.etb).toLocaleDateString("en-GB")
    : "TBD";
  return `${this.vesselName} - ${this.terminal.name} (${etbDate})`;
});

// ✅ VIRTUAL PARA MOSTRAR INFORMACIÓN COMPLETA
shipNominationSchema.virtual("fullDisplayName").get(function () {
  const etbDate = this.etb
    ? new Date(this.etb).toLocaleDateString("en-GB")
    : "TBD";
  const etbTime = this.etb
    ? new Date(this.etb).toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";
  return `${this.vesselName} | ${this.amspecRef} | ${this.terminal.name} - ${this.berth.name} | ${etbDate} ${etbTime}`;
});

// ========================================
// VALIDACIÓN PERSONALIZADA DE FECHAS
// ========================================
shipNominationSchema.methods.validateDateSequence = function () {
  const errors = [];

  if (this.etb && this.pilotOnBoard && this.etb < this.pilotOnBoard) {
    errors.push("ETB must be after Pilot on Board time");
  }

  if (this.etc && this.etb && this.etc < this.etb) {
    errors.push("ETC must be after ETB time");
  }

  if (this.etc && this.pilotOnBoard && this.etc < this.pilotOnBoard) {
    errors.push("ETC must be after Pilot on Board time");
  }

  return errors;
};

// ✅ MÉTODO PARA VERIFICAR SI ES DUPLICADO
shipNominationSchema.methods.checkDuplicates = async function () {
  const errors = [];

  // Verificar amspecRef duplicado
  if (this.amspecRef) {
    const existingAmspec = await this.constructor.findOne({
      amspecRef: this.amspecRef,
      _id: { $ne: this._id }, // Excluir el documento actual en updates
    });
    if (existingAmspec) {
      errors.push(`AmSpec Reference "${this.amspecRef}" already exists`);
    }
  }

  // Verificar clientRef duplicado (si existe)
  if (this.clientRef) {
    const existingClientRef = await this.constructor.findOne({
      clientRef: this.clientRef,
      _id: { $ne: this._id }, // Excluir el documento actual en updates
    });
    if (existingClientRef) {
      errors.push(`Client Reference "${this.clientRef}" already exists`);
    }
  }

  return errors;
};

// ========================================
// ✅ MIDDLEWARE PRE-SAVE MEJORADO
// ========================================
shipNominationSchema.pre("save", async function (next) {
  try {
    // Validar secuencia de fechas
    const dateErrors = this.validateDateSequence();
    if (dateErrors.length > 0) {
      const error = new Error(
        `Date validation failed: ${dateErrors.join(", ")}`
      );
      return next(error);
    }

    // Verificar duplicados
    const duplicateErrors = await this.checkDuplicates();
    if (duplicateErrors.length > 0) {
      const error = new Error(
        `Duplicate validation failed: ${duplicateErrors.join(", ")}`
      );
      return next(error);
    }

    // Asegurar que productTypes no esté vacío
    if (!this.productTypes || this.productTypes.length === 0) {
      const error = new Error("At least one product type must be selected");
      return next(error);
    }

    next();
  } catch (error) {
    next(error);
  }
});

// ========================================
// ✅ MÉTODOS ESTÁTICOS MEJORADOS PARA BÚSQUEDAS
// ========================================
shipNominationSchema.statics.findByDateRange = function (startDate, endDate) {
  return this.find({
    etb: {
      $gte: startDate,
      $lte: endDate,
    },
  }).sort({ etb: 1 });
};

shipNominationSchema.statics.findByVessel = function (vesselName) {
  return this.find({
    vesselName: new RegExp(vesselName, "i"),
  }).sort({ etb: 1 });
};

shipNominationSchema.statics.findByAmspecRef = function (amspecRef) {
  return this.findOne({ amspecRef: amspecRef });
};

// ✅ NUEVOS MÉTODOS PARA VALIDACIÓN
shipNominationSchema.statics.checkAmspecExists = function (
  amspecRef,
  excludeId = null
) {
  const query = { amspecRef: amspecRef.trim() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return this.findOne(query);
};

shipNominationSchema.statics.checkClientRefExists = function (
  clientRef,
  excludeId = null
) {
  if (!clientRef || clientRef.trim() === "") return Promise.resolve(null);

  const query = { clientRef: clientRef.trim() };
  if (excludeId) {
    query._id = { $ne: excludeId };
  }
  return this.findOne(query);
};

// ✅ BÚSQUEDA AVANZADA
shipNominationSchema.statics.findWithFilters = function (filters = {}) {
  const query = {};

  if (filters.vessel) {
    query.vesselName = new RegExp(filters.vessel, "i");
  }

  if (filters.terminal) {
    query["terminal.name"] = filters.terminal;
  }

  if (filters.client) {
    query["clientName.name"] = filters.client;
  }

  if (filters.status) {
    query.status = filters.status;
  }

  if (filters.dateFrom || filters.dateTo) {
    query.etb = {};
    if (filters.dateFrom) query.etb.$gte = new Date(filters.dateFrom);
    if (filters.dateTo) query.etb.$lte = new Date(filters.dateTo);
  }

  return this.find(query).sort({ etb: 1 });
};

// ✅ OBTENER ESTADÍSTICAS
shipNominationSchema.statics.getStats = function () {
  return this.aggregate([
    {
      $group: {
        _id: "$status",
        count: { $sum: 1 },
      },
    },
    {
      $sort: { count: -1 },
    },
  ]);
};

module.exports = mongoose.model("ShipNomination", shipNominationSchema);
