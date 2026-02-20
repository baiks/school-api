'use strict';
const School = require('./School.model.js');

module.exports = class SchoolManager {
    constructor({ config }) {
        this.config = config;
    }

    async create({ name, address, phone, email, website }) {
        const exists = await School.findOne({ name });
        if (exists) return { error: 'School with this name already exists', code: 409 };
        const school = await School.create({ name, address, phone, email, website });
        return { data: school };
    }

    async list({ page = 1, limit = 20 } = {}) {
        const skip    = (page - 1) * limit;
        const [schools, total] = await Promise.all([
            School.find({ isActive: true }).skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
            School.countDocuments({ isActive: true }),
        ]);
        return { data: { schools, total, page: Number(page), limit: Number(limit) } };
    }

    async getById(id) {
        const school = await School.findById(id);
        if (!school || !school.isActive) return { error: 'School not found', code: 404 };
        return { data: school };
    }

    async update(id, updates) {
        const school = await School.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
        if (!school) return { error: 'School not found', code: 404 };
        return { data: school };
    }

    async delete(id) {
        const school = await School.findByIdAndUpdate(id, { isActive: false }, { new: true });
        if (!school) return { error: 'School not found', code: 404 };
        return { data: { message: 'School deleted successfully' } };
    }
};
