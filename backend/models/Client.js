// backend/models/Client.js - SIMPLIFICADO con Hard Delete
const mongoose = require('mongoose');

const clientSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true // Agrega automáticamente createdAt y updatedAt
});

module.exports = mongoose.model('Client', clientSchema);