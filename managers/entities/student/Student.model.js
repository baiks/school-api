'use strict';
const mongoose = require('mongoose');

const studentSchema = new mongoose.Schema({
    firstName:   { type: String, required: true, trim: true },
    lastName:    { type: String, required: true, trim: true },
    email:       { type: String, required: true, unique: true, trim: true, lowercase: true },
    dateOfBirth: { type: Date },
    schoolId:    { type: mongoose.Schema.Types.ObjectId, ref: 'School', required: true },
    classroomId: { type: mongoose.Schema.Types.ObjectId, ref: 'Classroom', default: null },
    isEnrolled:  { type: Boolean, default: true },
}, { timestamps: true });

module.exports = mongoose.model('Student', studentSchema);
