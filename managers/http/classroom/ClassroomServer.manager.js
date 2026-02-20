'use strict';
const { Router } = require('express');

module.exports = class ClassroomServer {
    constructor({ config, managers }) {
        this.config             = config;
        this.classroomManager   = managers.classroomManager;
        this.responseDispatcher = managers.responseDispatcher;
        this.router             = Router();
        this._setup();
    }

    _setup() {
        const { router, classroomManager, responseDispatcher } = this;

        const ok  = (res, result) => responseDispatcher.dispatch(res, { ok: true,  data: result.data, code: result.code || 200 });
        const err = (res, result) => responseDispatcher.dispatch(res, { ok: false, errors: result.error, message: result.error, code: result.code || 400 });

        // GET /api/classrooms
        router.get('/', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : req.query.schoolId;
            const result   = await classroomManager.list({ ...req.query, schoolId });
            return result.error ? err(res, result) : ok(res, result);
        });

        // POST /api/classrooms
        router.post('/', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : req.body.schoolId;
            if (!schoolId) {
                return res.status(400).json({ ok: false, message: 'Missing required field: schoolId' });
            }
            const { name, capacity, resources } = req.body;
            if (!name || !capacity) {
                return res.status(400).json({ ok: false, message: 'Missing required fields: name, capacity' });
            }
            const result = await classroomManager.create({ name, schoolId, capacity, resources });
            return result.error ? err(res, result) : ok(res, { ...result, code: 201 });
        });

        // GET /api/classrooms/:id
        router.get('/:id', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : null;
            const result   = await classroomManager.getById(req.params.id, schoolId);
            return result.error ? err(res, result) : ok(res, result);
        });

        // PUT /api/classrooms/:id
        router.put('/:id', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : null;
            const { name, capacity, resources } = req.body;
            const result = await classroomManager.update(req.params.id, schoolId, { name, capacity, resources });
            return result.error ? err(res, result) : ok(res, result);
        });

        // DELETE /api/classrooms/:id
        router.delete('/:id', async (req, res) => {
            const schoolId = req.user.role === 'school_admin' ? req.user.schoolId : null;
            const result   = await classroomManager.delete(req.params.id, schoolId);
            return result.error ? err(res, result) : ok(res, result);
        });
    }

    getRouter() {
        return this.router;
    }
};
