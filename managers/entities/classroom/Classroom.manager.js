'use strict';
const Classroom = require('./Classroom.model.js');
const School    = require('../school/School.model.js');

module.exports = class ClassroomManager {
    constructor({ config }) {
        this.config = config;
    }

    async create({ name, schoolId, capacity, resources }) {
        const school = await School.findById(schoolId);
        if (!school || !school.isActive) return { error: 'School not found', code: 404 };

        const exists = await Classroom.findOne({ name, schoolId, isActive: true });
        if (exists) return { error: 'Classroom with this name already exists in this school', code: 409 };

        const classroom = await Classroom.create({ name, schoolId, capacity, resources: resources || [] });
        return { data: classroom };
    }

    async list({ schoolId, page = 1, limit = 20 } = {}) {
        const filter = { isActive: true };
        if (schoolId) filter.schoolId = schoolId;
        const skip = (page - 1) * limit;
        const [classrooms, total] = await Promise.all([
            Classroom.find(filter).populate('schoolId', 'name').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
            Classroom.countDocuments(filter),
        ]);
        return { data: { classrooms, total, page: Number(page), limit: Number(limit) } };
    }

    async getById(id, schoolId = null) {
        const filter = { _id: id, isActive: true };
        if (schoolId) filter.schoolId = schoolId;
        const classroom = await Classroom.findOne(filter).populate('schoolId', 'name');
        if (!classroom) return { error: 'Classroom not found', code: 404 };
        return { data: classroom };
    }

    async update(id, schoolId, updates) {
        const filter = { _id: id, isActive: true };
        if (schoolId) filter.schoolId = schoolId;
        const classroom = await Classroom.findOneAndUpdate(filter, updates, { new: true, runValidators: true });
        if (!classroom) return { error: 'Classroom not found', code: 404 };
        return { data: classroom };
    }

    async delete(id, schoolId = null) {
        const filter = { _id: id };
        if (schoolId) filter.schoolId = schoolId;
        const classroom = await Classroom.findOneAndUpdate(filter, { isActive: false }, { new: true });
        if (!classroom) return { error: 'Classroom not found', code: 404 };
        return { data: { message: 'Classroom deleted successfully' } };
    }
};
