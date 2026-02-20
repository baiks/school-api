'use strict';

module.exports = class ResponseDispatcher {
    dispatch(res, { ok, data, errors, message, code }) {
        const status = ok ? (code || 200) : (code || 400);
        return res.status(status).json({
            ok,
            data:    data    || null,
            errors:  errors  || null,
            message: message || (ok ? 'success' : 'error'),
        });
    }
};
