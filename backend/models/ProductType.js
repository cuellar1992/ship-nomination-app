// backend/models/ProductType.js
const mongoose = require('mongoose');

const productTypeSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    }
}, {
    timestamps: true
});

module.exports = mongoose.model('ProductType', productTypeSchema);