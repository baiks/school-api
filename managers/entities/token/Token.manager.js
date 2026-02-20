'use strict';
const jwt = require('jsonwebtoken');

module.exports = class TokenManager {
    constructor({ config }) {
        this.longSecret  = config.dotEnv.LONG_TOKEN_SECRET;
        this.shortSecret = config.dotEnv.SHORT_TOKEN_SECRET;
    }

    genLongToken({ userId, role, schoolId }) {
        return jwt.sign({ userId, role, schoolId }, this.longSecret, { expiresIn: '30d' });
    }

    genShortToken({ userId, role, schoolId }) {
        return jwt.sign({ userId, role, schoolId }, this.shortSecret, { expiresIn: '1h' });
    }

    verifyLongToken(token) {
        try {
            return { decoded: jwt.verify(token, this.longSecret), error: null };
        } catch (err) {
            return { decoded: null, error: err.message };
        }
    }

    verifyShortToken(token) {
        try {
            return { decoded: jwt.verify(token, this.shortSecret), error: null };
        } catch (err) {
            return { decoded: null, error: err.message };
        }
    }
};
