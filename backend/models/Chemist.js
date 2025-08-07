const mongoose = require('mongoose');

const chemistSchema = new mongoose.Schema({
  name: { type: String, required: true, unique: true, trim: true },
  email: {
    type: String,
    required: false,
    trim: true,
    lowercase: true,
    validate: {
      validator: function(email) {
        if (!email || email.trim() === '') return true;
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
      },
      message: 'Please enter a valid email address'
    }
  },
  phone: {
    type: String,
    required: false,
    trim: true,
    validate: {
      validator: function(phone) {
        if (!phone || phone.trim() === '') return true;
        const phoneRegex = /^[\+]?[\d\s\-\(\)\.]{8,20}$/;
        return phoneRegex.test(phone);
      },
      message: 'Please enter a valid phone number'
    }
  }
}, { timestamps: true });

// Métodos útiles
chemistSchema.methods.hasContactInfo = function() {
  return !!(this.email && this.email.trim());
};

chemistSchema.methods.getDisplayInfo = function() {
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

module.exports = mongoose.model('Chemist', chemistSchema); 