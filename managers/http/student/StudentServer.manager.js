'use strict';
const { Router } = require('express');

module.exports = class StudentServer {
    constructor({ config, managers }) {
        this.config             = config;
        this.studentManager     = managers.studentManager;
        this.responseDispatcher = managers.responseDispatcher;
        this.router             = Router();
        this._setup();
    }

    _setup() {
        const { router, studentManager, responseDispatcher } = this;

        const ok  = (res, result) => responseDispatcher.dispatch(res, { ok: true,  data: result.data, code: result.code || 200 });
        const err = (res, result) => responseDispatcher.dispatch(res, { ok: false, errors: result.error, message: result.error, code: result.code || 400 });

        // GET /api/students
        router.get('/', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : req.query.schoolId;
            const result   = await studentManager.list({ ...req.query, schoolId });
            return result.error ? err(res, result) : ok(res, result);
        });

        // POST /api/students
        router.post('/', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : req.body.schoolId;
            if (!schoolId) {
                return res.status(400).json({ ok: false, message: 'Missing required field: schoolId' });
            }
            const { firstName, lastName, email, dateOfBirth, classroomId } = req.body;
            if (!firstName || !lastName || !email) {
                return res.status(400).json({ ok: false, message: 'Missing required fields: firstName, lastName, email' });
            }
            const result = await studentManager.create({ firstName, lastName, email, dateOfBirth, schoolId, classroomId });
            return result.error ? err(res, result) : ok(res, { ...result, code: 201 });
        });

        // GET /api/students/:id
        router.get('/:id', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : null;
            const result   = await studentManager.getById(req.params.id, schoolId);
            return result.error ? err(res, result) : ok(res, result);
        });

        // PUT /api/students/:id
        router.put('/:id', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : null;
            const { firstName, lastName, email, dateOfBirth, classroomId } = req.body;
            const result = await studentManager.update(req.params.id, schoolId, { firstName, lastName, email, dateOfBirth, classroomId });
            return result.error ? err(res, result) : ok(res, result);
        });

        // POST /api/students/:id/transfer
        router.post('/:id/transfer', async (req, res) => {
            const { targetSchoolId, targetClassroomId } = req.body;
            if (!targetSchoolId) {
                return res.status(400).json({ ok: false, message: 'Missing required field: targetSchoolId' });
            }
            const requestorSchoolId = req.user.role === 'school_admin' ? req.user.schoolId : null;
            const result = await studentManager.transfer({
                studentId: req.params.id,
                targetSchoolId,
                targetClassroomId,
                requestorSchoolId,
            });
            return result.error ? err(res, result) : ok(res, result);
        });

        // DELETE /api/students/:id
        router.delete('/:id', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : null;
            const result   = await studentManager.delete(req.params.id, schoolId);
            return result.error ? err(res, result) : ok(res, result);
        });
    }

    getRouter() {
        return this.router;
    }
};
