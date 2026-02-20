'use strict';
const mongoose = require('mongoose');

const classroomSchema = new mongoose.Schema({
    name:      { type: String, required: true, trim: true },
    schoolId:  { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    capacity:  { type: Number, required: true, min: 1 },
    resources: [{ type: String, trim: true }],
    isActive:  { type: Boolean, default: true },
}, { timestamps: true });

classroomSchema.index({ name: 1, schoolId: 1 }, { unique: true });

module.exports = mongoose.model('Classroom', classroomSchema);
