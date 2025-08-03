// backend/models/Sampler.js
const mongoose = require('mongoose');

const samplerSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('Sampler', samplerSchema);