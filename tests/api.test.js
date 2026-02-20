'use strict';
/**
 * Integration tests for School Management System API
 * Run: npm test
 *
 * Requires a running MongoDB instance (uses test database).
 */
const request  = require('supertest');
const mongoose = require('mongoose');

// ── Setup ─────────────────────────────────────────────────────────────────────
process.env.LONG_TOKEN_SECRET  = 'test_long_secret_12345678901234567890';
process.env.SHORT_TOKEN_SECRET = 'test_short_secret_1234567890123456789';
process.env.NACL_SECRET        = 'test_nacl_secret_12345678901234567890';
process.env.MONGO_URI          = 'mongodb://localhost:27017/school-api-test';
process.env.ENV                = 'development';

let app;
let superToken, adminToken;
let schoolId, classroomId, studentId, adminUserId;

beforeAll(async () => {
    const config          = require('../config/index.config.js');
    const Cortex          = require('ion-cortex');
    const ManagersLoader  = require('../loaders/ManagersLoader.js');
    const User            = require('../managers/entities/user/User.model.js');
    const School          = require('../managers/entities/school/School.model.js');
    const Classroom       = require('../managers/entities/classroom/Classroom.model.js');
    const Student         = require('../managers/entities/student/Student.model.js');

    await mongoose.connect(config.dotEnv.MONGO_URI);
    // Clean test DB
    await Promise.all([User.deleteMany({}), School.deleteMany({}), Classroom.deleteMany({}), Student.deleteMany({})]);

    // Seed superadmin
    await User.create({ username: 'superadmin', email: 'super@test.com', password: 'password123', role: 'superadmin' });

    const cortex = new Cortex({
        prefix: 'test', url: config.dotEnv.CORTEX_REDIS, type: 'test',
        state: () => ({}), activeDelay: '50ms', idlDelay: '200ms',
    });

    const loader   = new ManagersLoader({ config, cortex });
    const managers = loader.load();
    app = managers.userServer.app;
});

afterAll(async () => {
    await mongoose.connection.dropDatabase();
    await mongoose.disconnect();
});

// ── Auth Tests ────────────────────────────────────────────────────────────────
describe('Auth', () => {
    test('POST /api/auth/login - superadmin login', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'super@test.com', password: 'password123' });
        expect(res.status).toBe(200);
        expect(res.body.ok).toBe(true);
        expect(res.body.data.longToken).toBeDefined();
        superToken = res.body.data.shortToken;
    });

    test('POST /api/auth/login - wrong password returns 401', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'super@test.com', password: 'wrong' });
        expect(res.status).toBe(401);
    });

    test('GET /api/auth/me - returns user profile', async () => {
        const res = await request(app)
            .get('/api/auth/me')
            .set('Authorization', `Bearer ${superToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.role).toBe('superadmin');
    });
});

// ── School Tests ──────────────────────────────────────────────────────────────
describe('Schools', () => {
    test('POST /api/schools - superadmin creates school', async () => {
        const res = await request(app)
            .post('/api/schools')
            .set('Authorization', `Bearer ${superToken}`)
            .send({ name: 'Test School', address: '123 Main St', email: 'school@test.com' });
        expect(res.status).toBe(201);
        expect(res.body.data.name).toBe('Test School');
        schoolId = res.body.data._id;
    });

    test('GET /api/schools - lists schools', async () => {
        const res = await request(app)
            .get('/api/schools')
            .set('Authorization', `Bearer ${superToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.schools.length).toBeGreaterThan(0);
    });

    test('GET /api/schools/:id - gets school by id', async () => {
        const res = await request(app)
            .get(`/api/schools/${schoolId}`)
            .set('Authorization', `Bearer ${superToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data._id).toBe(schoolId);
    });

    test('PUT /api/schools/:id - updates school', async () => {
        const res = await request(app)
            .put(`/api/schools/${schoolId}`)
            .set('Authorization', `Bearer ${superToken}`)
            .send({ name: 'Updated School', address: '456 Oak Ave' });
        expect(res.status).toBe(200);
        expect(res.body.data.name).toBe('Updated School');
    });
});

// ── User/Admin Tests ──────────────────────────────────────────────────────────
describe('Admin Users', () => {
    test('POST /api/auth/register - superadmin creates school_admin', async () => {
        const res = await request(app)
            .post('/api/auth/register')
            .set('Authorization', `Bearer ${superToken}`)
            .send({ username: 'schooladmin', email: 'admin@school.com', password: 'admin123', role: 'school_admin', schoolId });
        expect(res.status).toBe(200);
        adminUserId = res.body.data._id;
    });

    test('school_admin can login and get token', async () => {
        const res = await request(app)
            .post('/api/auth/login')
            .send({ email: 'admin@school.com', password: 'admin123' });
        expect(res.status).toBe(200);
        adminToken = res.body.data.shortToken;
    });
});

// ── Classroom Tests ───────────────────────────────────────────────────────────
describe('Classrooms', () => {
    test('POST /api/classrooms - superadmin creates classroom', async () => {
        const res = await request(app)
            .post('/api/classrooms')
            .set('Authorization', `Bearer ${superToken}`)
            .send({ name: 'Room 101', schoolId, capacity: 30, resources: ['projector', 'whiteboard'] });
        expect(res.status).toBe(201);
        classroomId = res.body.data._id;
    });

    test('GET /api/classrooms - lists classrooms', async () => {
        const res = await request(app)
            .get('/api/classrooms')
            .set('Authorization', `Bearer ${superToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.classrooms.length).toBeGreaterThan(0);
    });

    test('school_admin can list their own classrooms', async () => {
        const res = await request(app)
            .get('/api/classrooms')
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(200);
    });

    test('PUT /api/classrooms/:id - updates classroom', async () => {
        const res = await request(app)
            .put(`/api/classrooms/${classroomId}`)
            .set('Authorization', `Bearer ${superToken}`)
            .send({ capacity: 35 });
        expect(res.status).toBe(200);
        expect(res.body.data.capacity).toBe(35);
    });
});

// ── Student Tests ─────────────────────────────────────────────────────────────
describe('Students', () => {
    test('POST /api/students - creates student', async () => {
        const res = await request(app)
            .post('/api/students')
            .set('Authorization', `Bearer ${superToken}`)
            .send({ firstName: 'John', lastName: 'Doe', email: 'john@test.com', schoolId, classroomId });
        expect(res.status).toBe(201);
        expect(res.body.data.firstName).toBe('John');
        studentId = res.body.data._id;
    });

    test('GET /api/students - lists students', async () => {
        const res = await request(app)
            .get('/api/students')
            .set('Authorization', `Bearer ${superToken}`);
        expect(res.status).toBe(200);
        expect(res.body.data.students.length).toBeGreaterThan(0);
    });

    test('PUT /api/students/:id - updates student profile', async () => {
        const res = await request(app)
            .put(`/api/students/${studentId}`)
            .set('Authorization', `Bearer ${superToken}`)
            .send({ firstName: 'Jane' });
        expect(res.status).toBe(200);
        expect(res.body.data.firstName).toBe('Jane');
    });

    test('POST /api/students/:id/transfer - transfers student to another school', async () => {
        // Create second school first
        const s2 = await request(app)
            .post('/api/schools')
            .set('Authorization', `Bearer ${superToken}`)
            .send({ name: 'Second School', address: '789 Pine St' });
        const targetSchoolId = s2.body.data._id;

        const res = await request(app)
            .post(`/api/students/${studentId}/transfer`)
            .set('Authorization', `Bearer ${superToken}`)
            .send({ targetSchoolId });
        expect(res.status).toBe(200);
        expect(res.body.data.schoolId.toString()).toBe(targetSchoolId);
    });

    test('DELETE /api/students/:id - unenrolls student', async () => {
        const res = await request(app)
            .delete(`/api/students/${studentId}`)
            .set('Authorization', `Bearer ${superToken}`);
        expect(res.status).toBe(200);
    });
});

// ── RBAC Enforcement ──────────────────────────────────────────────────────────
describe('RBAC', () => {
    test('school_admin cannot create schools', async () => {
        const res = await request(app)
            .post('/api/schools')
            .set('Authorization', `Bearer ${adminToken}`)
            .send({ name: 'Unauthorized School', address: '000 Hack St' });
        expect(res.status).toBe(403);
    });

    test('unauthenticated request returns 401', async () => {
        const res = await request(app).get('/api/schools');
        expect(res.status).toBe(401);
    });

    test('DELETE /api/schools/:id - only superadmin can delete', async () => {
        const res = await request(app)
            .delete(`/api/schools/${schoolId}`)
            .set('Authorization', `Bearer ${adminToken}`);
        expect(res.status).toBe(403);
    });
});
