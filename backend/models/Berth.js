const mongoose = require('mongoose');

const berthSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true,
        unique: true,
        trim: true
    },
    terminals: [{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Terminal',
        required: true
    }]
}, {
    timestamps: true
});

module.exports = mongoose.model('Berth', berthSchema);