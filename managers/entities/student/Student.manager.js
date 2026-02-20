'use strict';
const Student   = require('./Student.model.js');
const School    = require('../school/School.model.js');
const Classroom = require('../classroom/Classroom.model.js');

module.exports = class StudentManager {
    constructor({ config }) {
        this.config = config;
    }

    async create({ firstName, lastName, email, dateOfBirth, schoolId, classroomId }) {
        const school = await School.findById(schoolId);
        if (!school || !school.isActive) return { error: 'School not found', code: 404 };

        if (classroomId) {
            const classroom = await Classroom.findOne({ _id: classroomId, schoolId, isActive: true });
            if (!classroom) return { error: 'Classroom not found in this school', code: 404 };
        }

        const exists = await Student.findOne({ email });
        if (exists) return { error: 'Student with this email already exists', code: 409 };

        const student = await Student.create({ firstName, lastName, email, dateOfBirth, schoolId, classroomId: classroomId || null });
        return { data: student };
    }

    async list({ schoolId, classroomId, page = 1, limit = 20 } = {}) {
        const filter = { isEnrolled: true };
        if (schoolId)    filter.schoolId = schoolId;
        if (classroomId) filter.classroomId = classroomId;
        const skip = (page - 1) * limit;
        const [students, total] = await Promise.all([
            Student.find(filter).populate('schoolId', 'name').populate('classroomId', 'name').skip(skip).limit(Number(limit)).sort({ createdAt: -1 }),
            Student.countDocuments(filter),
        ]);
        return { data: { students, total, page: Number(page), limit: Number(limit) } };
    }

    async getById(id, schoolId = null) {
        const filter = { _id: id };
        if (schoolId) filter.schoolId = schoolId;
        const student = await Student.findOne(filter).populate('schoolId', 'name').populate('classroomId', 'name');
        if (!student) return { error: 'Student not found', code: 404 };
        return { data: student };
    }

    async update(id, schoolId, updates) {
        // Don't allow school transfer via update — use transfer method
        delete updates.schoolId;
        const filter = { _id: id };
        if (schoolId) filter.schoolId = schoolId;
        const student = await Student.findOneAndUpdate(filter, updates, { new: true, runValidators: true });
        if (!student) return { error: 'Student not found', code: 404 };
        return { data: student };
    }

    async transfer({ studentId, targetSchoolId, targetClassroomId, requestorSchoolId }) {
        const filter = { _id: studentId };
        if (requestorSchoolId) filter.schoolId = requestorSchoolId; // school_admin can only transfer their own students

        const student = await Student.findOne(filter);
        if (!student) return { error: 'Student not found', code: 404 };

        const targetSchool = await School.findById(targetSchoolId);
        if (!targetSchool || !targetSchool.isActive) return { error: 'Target school not found', code: 404 };

        if (targetClassroomId) {
            const classroom = await Classroom.findOne({ _id: targetClassroomId, schoolId: targetSchoolId, isActive: true });
            if (!classroom) return { error: 'Target classroom not found in target school', code: 404 };
        }

        student.schoolId    = targetSchoolId;
        student.classroomId = targetClassroomId || null;
        await student.save();
        return { data: student };
    }

    async delete(id, schoolId = null) {
        const filter = { _id: id };
        if (schoolId) filter.schoolId = schoolId;
        const student = await Student.findOneAndUpdate(filter, { isEnrolled: false }, { new: true });
        if (!student) return { error: 'Student not found', code: 404 };
        return { data: { message: 'Student unenrolled successfully' } };
    }
};
