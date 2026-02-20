'use strict';

/**
 * Authentication middleware factory
 * @param {Object} tokenManager
 * @param {string[]} allowedRoles - e.g. ['superadmin'] or ['superadmin', 'school_admin']
 */
module.exports = function authMiddleware(tokenManager, allowedRoles = []) {
    return function (req, res, next) {
        const authHeader = req.headers['authorization'];
        if (!authHeader || !authHeader.startsWith('Bearer ')) {
            return res.status(401).json({ ok: false, message: 'Missing or malformed Authorization header' });
        }

        const token = authHeader.split(' ')[1];
        const { decoded, error } = tokenManager.verifyShortToken(token);

        if (error) {
            return res.status(401).json({ ok: false, message: 'Invalid or expired token' });
        }

        if (allowedRoles.length && !allowedRoles.includes(decoded.role)) {
            return res.status(403).json({ ok: false, message: 'Forbidden: insufficient permissions' });
        }

        req.user = decoded; // { userId, role, schoolId }
        next();
    };
};
