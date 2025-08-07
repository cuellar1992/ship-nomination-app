// backend/models/Sampler.js - EXTENDIDO PARA EMAILS
const mongoose = require('mongoose');

const samplerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    // NUEVOS CAMPOS OPCIONALES - NO ROMPEN NADA EXISTENTE
    email: {
        type: String,
        required: false,        // Opcional para compatibilidad
        trim: true,
        lowercase: true,
        validate: {
            validator: function(email) {
                // Solo validar si el email no está vacío
                if (!email || email.trim() === '') return true;
                
                // Validación básica de formato email
                const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
                return emailRegex.test(email);
            },
            message: 'Please enter a valid email address'
        }
    },
    phone: {
        type: String,
        required: false,        // Opcional para compatibilidad
        trim: true,
        validate: {
            validator: function(phone) {
                // Solo validar si el teléfono no está vacío
                if (!phone || phone.trim() === '') return true;
                
                // Validación flexible de teléfono (acepta varios formatos)
                const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{8,20}$/;
                return phoneRegex.test(phone);
            },
            message: 'Please enter a valid phone number'
        }
    }
}, {
    timestamps: true // Mantiene createdAt y updatedAt automáticos
});

// ÍNDICES PARA PERFORMANCE
samplerSchema.index({ email: 1 }, { 
    sparse: true,        // Solo indexa documentos con email
    unique: true,        // Email único cuando existe
    partialFilterExpression: { 
        email: { $exists: true, $ne: "", $ne: null } 
    }
});

// MÉTODOS ÚTILES DEL MODELO
samplerSchema.methods.hasContactInfo = function() {
    return !!(this.email && this.email.trim());
};

samplerSchema.methods.getDisplayInfo = function() {
    return {
        id: this._id,
        name: this.name,
        email: this.email || null,
        phone: this.phone || null,
        hasEmail: this.hasContactInfo(),
        createdAt: this.createdAt,
        updatedAt: this.updatedAt
    };
};

// STATIC METHODS PARA QUERIES COMUNES
samplerSchema.statics.findWithEmail = function() {
    return this.find({
        email: { $exists: true, $ne: "", $ne: null }
    });
};

samplerSchema.statics.findWithoutEmail = function() {
    return this.find({
        $or: [
            { email: { $exists: false } },
            { email: "" },
            { email: null }
        ]
    });
};

module.exports = mongoose.model('Sampler', samplerSchema);
