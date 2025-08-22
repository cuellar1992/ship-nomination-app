// backend/models/Sampler.js - EXTENDIDO PARA EMAILS
const mongoose = require("mongoose");

const samplerSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      trim: true,
    },
    // NUEVOS CAMPOS OPCIONALES
    email: {
      type: String,
      required: false, // Opcional para compatibilidad
      trim: true,
      lowercase: true,
      validate: {
        validator: function (email) {
          // Solo validar si el email no está vacío
          if (!email || email.trim() === "") return true;

          // Validación básica de formato email
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          return emailRegex.test(email);
        },
        message: "Please enter a valid email address",
      },
    },
    phone: {
      type: String,
      required: false, // Opcional para compatibilidad
      trim: true,
      validate: {
        validator: function (phone) {
          // Solo validar si el teléfono no está vacío
          if (!phone || phone.trim() === "") return true;

          // Validación flexible de teléfono (acepta varios formatos)
          const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{8,20}$/;
          return phoneRegex.test(phone);
        },
        message: "Please enter a valid phone number",
      },
    },
    // 🆕 WEEKLY RESTRICTION TOGGLE
    weeklyRestriction: {
      type: Boolean,
      required: false, // Opcional para compatibilidad
      default: false, // Por defecto sin restricción
    },
    // 🆕 RESTRICCIONES POR DÍAS DE LA SEMANA
    weekDayRestrictions: {
      type: {
        monday: { type: Boolean, default: false },
        tuesday: { type: Boolean, default: false },
        wednesday: { type: Boolean, default: false },
        thursday: { type: Boolean, default: false },
        friday: { type: Boolean, default: false },
        saturday: { type: Boolean, default: false },
        sunday: { type: Boolean, default: false }
      },
      default: {
        monday: false,
        tuesday: false,
        wednesday: false,
        thursday: false,
        friday: false,
        saturday: false,
        sunday: false
      }
    },
  },
  {
    timestamps: true, // Mantiene createdAt y updatedAt automáticos
  }
);

// ÍNDICES PARA PERFORMANCE
samplerSchema.index(
  { email: 1 },
  {
    sparse: true, // Solo indexa documentos con email
    unique: true, // Email único cuando existe
    partialFilterExpression: {
      email: { $exists: true, $ne: "", $ne: null },
    },
  }
);

// MÉTODOS ÚTILES DEL MODELO
samplerSchema.methods.hasContactInfo = function () {
  return !!(this.email && this.email.trim());
};

// Verificar si tiene restricción semanal
samplerSchema.methods.hasWeeklyRestriction = function() {
    return Boolean(this.weeklyRestriction);
};

// Verificar si un día está restringido
samplerSchema.methods.isDayRestricted = function(dayName) {
    if (!this.weekDayRestrictions) return false;
    return Boolean(this.weekDayRestrictions[dayName]);
};

// Verificar si tiene alguna restricción de día
samplerSchema.methods.hasAnyDayRestrictions = function() {
    if (!this.weekDayRestrictions) return false;
    return Object.values(this.weekDayRestrictions).some(day => day === true);
};

// Obtener días restringidos
samplerSchema.methods.getRestrictedDays = function() {
    if (!this.weekDayRestrictions) return [];
    return Object.keys(this.weekDayRestrictions).filter(day => this.weekDayRestrictions[day]);
};

samplerSchema.methods.getDisplayInfo = function () {
  return {
    id: this._id,
    name: this.name,
    email: this.email || null,
    phone: this.phone || null,
    weeklyRestriction: this.weeklyRestriction || false,
    weekDayRestrictions: this.weekDayRestrictions || {
      monday: false,
      tuesday: false,
      wednesday: false,
      thursday: false,
      friday: false,
      saturday: false,
      sunday: false
    },
    hasEmail: this.hasContactInfo(),
    createdAt: this.createdAt,
    updatedAt: this.updatedAt,
  };
};

// STATIC METHODS PARA QUERIES COMUNES
samplerSchema.statics.findWithEmail = function () {
  return this.find({
    email: { $exists: true, $ne: "", $ne: null },
  });
};

samplerSchema.statics.findWithoutEmail = function () {
  return this.find({
    $or: [{ email: { $exists: false } }, { email: "" }, { email: null }],
  });
};

module.exports = mongoose.model("Sampler", samplerSchema);
