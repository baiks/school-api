'use strict';
module.exports = {
    dotEnv: {},
    mongo: {
        uri: process.env.MONGO_URI || 'mongodb://localhost:27017/school-api',
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 100,
    },
};
