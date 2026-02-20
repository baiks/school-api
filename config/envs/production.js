'use strict';
module.exports = {
    dotEnv: {},
    mongo: {
        uri: process.env.MONGO_URI,
    },
    rateLimit: {
        windowMs: 15 * 60 * 1000,
        max: 60,
    },
};
