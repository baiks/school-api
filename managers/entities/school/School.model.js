'use strict';
const mongoose = require('mongoose');

const schoolSchema = new mongoose.Schema({
    name:     { type: String, required: true, trim: true },
    address:  { type: String, required: true, trim: true },
    phone:    { type: String, trim: true },
    email:    { type: String, trim: true, lowercase: true },
    website:  { type: String, trim: true },
    isActive: { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('School', schoolSchema);
