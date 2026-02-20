'use strict';
const mongoose = require('mongoose');

module.exports = class MongoConnect {
    constructor({ config }) {
        this.config = config;
        this.uri    = config.dotEnv.MONGO_URI;
    }

    async connect() {
        try {
            await mongoose.connect(this.uri, {
                useNewUrlParser: true,
                useUnifiedTopology: true,
            });
            console.log(`[MongoDB] Connected: ${this.uri}`);
        } catch (err) {
            console.error('[MongoDB] Connection error:', err.message);
            process.exit(1);
        }
    }
};
