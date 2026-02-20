'use strict';

/**
 * Simple required-fields validator middleware
 * @param {string[]} fields
 */
module.exports = function validate(fields) {
    return function (req, res, next) {
        const missing = fields.filter(f => {
            const val = req.body[f];
            return val === undefined || val === null || val === '';
        });
        if (missing.length) {
            return res.status(400).json({ ok: false, message: `Missing required fields: ${missing.join(', ')}` });
        }
        next();
    };
};
