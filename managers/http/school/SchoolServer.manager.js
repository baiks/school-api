'use strict';
const { Router } = require('express');

module.exports = class SchoolServer {
    constructor({ config, managers }) {
        this.config         = config;
        this.schoolManager  = managers.schoolManager;
        this.responseDispatcher = managers.responseDispatcher;
        this.router         = Router();
        this._setup();
    }

    _setup() {
        const { router, schoolManager, responseDispatcher } = this;

        const ok  = (res, result) => responseDispatcher.dispatch(res, { ok: true,  data: result.data, code: result.code || 200 });
        const err = (res, result) => responseDispatcher.dispatch(res, { ok: false, errors: result.error, message: result.error, code: result.code || 400 });

        // GET /api/schools
        router.get('/', async (req, res) => {
            const result = await schoolManager.list(req.query);
            return result.error ? err(res, result) : ok(res, result);
        });

        // POST /api/schools
        router.post('/', async (req, res) => {
            if (req.user.role !== 'superadmin') {
                return res.status(403).json({ ok: false, message: 'Forbidden: superadmin only' });
            }
            const { name, address, phone, email, website } = req.body;
            if (!name || !address) {
                return res.status(400).json({ ok: false, message: 'Missing required fields: name, address' });
            }
            const result = await schoolManager.create({ name, address, phone, email, website });
            return result.error ? err(res, result) : ok(res, { ...result, code: 201 });
        });

        // GET /api/schools/:id
        router.get('/:id', async (req, res) => {
            const id = req.user.role === 'school_admin' ? req.user.schoolId : req.params.id;
            const result = await schoolManager.getById(id);
            return result.error ? err(res, result) : ok(res, result);
        });

        // PUT /api/schools/:id
        router.put('/:id', async (req, res) => {
            if (req.user.role !== 'superadmin') {
                return res.status(403).json({ ok: false, message: 'Forbidden: superadmin only' });
            }
            const { name, address, phone, email, website } = req.body;
            const result = await schoolManager.update(req.params.id, { name, address, phone, email, website });
            return result.error ? err(res, result) : ok(res, result);
        });

        // DELETE /api/schools/:id
        router.delete('/:id', async (req, res) => {
            if (req.user.role !== 'superadmin') {
                return res.status(403).json({ ok: false, message: 'Forbidden: superadmin only' });
            }
            const result = await schoolManager.delete(req.params.id);
            return result.error ? err(res, result) : ok(res, result);
        });
    }

    getRouter() {
        return this.router;
    }
};
