'use strict';
/**
 * Seed script — creates the initial superadmin user
 * Run: node scripts/seed.js
 */
require('dotenv').config({ path: '../.env' });
const mongoose = require('mongoose');
const bcrypt   = require('bcrypt');

const MONGO_URI = process.env.MONGO_URI || 'mongodb://localhost:27017/school-api';

async function seed() {
    await mongoose.connect(MONGO_URI);
    console.log('Connected to MongoDB');

    // Dynamically require model after connection
    const User = require('../managers/entities/user/User.model.js');

    const existing = await User.findOne({ role: 'superadmin' });
    if (existing) {
        console.log('Superadmin already exists:', existing.email);
        process.exit(0);
    }

    const user = await User.create({
        username: 'superadmin',
        email: 'superadmin@school-api.com',
        password: 'SuperAdmin@123',
        role: 'superadmin',
    });

    console.log('Superadmin created:');
    console.log('  Email:    superadmin@school-api.com');
    console.log('  Password: SuperAdmin@123');
    console.log('  ⚠️  Change this password immediately in production!');
    process.exit(0);
}

seed().catch(err => {
    console.error('Seed error:', err);
    process.exit(1);
});
