'use strict';
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'School Management System API',
            version: '1.0.0',
            description: 'RESTful API for managing schools, classrooms, and students with role-based access control.',
        },
        servers: [
            { url: 'http://localhost:5111', description: 'Development server' },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: 'http',
                    scheme: 'bearer',
                    bearerFormat: 'JWT',
                    description: 'Use the shortToken returned from /api/auth/login',
                },
            },
            schemas: {
                // ── Shared response envelope ──────────────────────────────────
                SuccessResponse: {
                    type: 'object',
                    properties: {
                        ok:      { type: 'boolean', example: true },
                        data:    { type: 'object' },
                        errors:  { type: 'string', nullable: true, example: null },
                        message: { type: 'string', example: 'success' },
                    },
                },
                ErrorResponse: {
                    type: 'object',
                    properties: {
                        ok:      { type: 'boolean', example: false },
                        data:    { type: 'object', nullable: true, example: null },
                        errors:  { type: 'string', example: 'Error description' },
                        message: { type: 'string', example: 'Error description' },
                    },
                },
                // ── Auth ──────────────────────────────────────────────────────
                LoginRequest: {
                    type: 'object',
                    required: ['email', 'password'],
                    properties: {
                        email:    { type: 'string', format: 'email', example: 'admin@school.com' },
                        password: { type: 'string', example: 'secret123' },
                    },
                },
                LoginResponse: {
                    type: 'object',
                    properties: {
                        user:        { $ref: '#/components/schemas/User' },
                        longToken:   { type: 'string', description: '30-day token used for refresh' },
                        shortToken:  { type: 'string', description: '1-hour token used for API calls' },
                    },
                },
                RegisterRequest: {
                    type: 'object',
                    required: ['username', 'email', 'password'],
                    properties: {
                        username: { type: 'string', example: 'john_admin' },
                        email:    { type: 'string', format: 'email', example: 'john@school.com' },
                        password: { type: 'string', example: 'secret123' },
                        role:     { type: 'string', enum: ['school_admin'], example: 'school_admin' },
                        schoolId: { type: 'string', example: '64abc123def456' },
                    },
                },
                // ── User ──────────────────────────────────────────────────────
                User: {
                    type: 'object',
                    properties: {
                        _id:      { type: 'string', example: '64abc123def456' },
                        username: { type: 'string', example: 'john_admin' },
                        email:    { type: 'string', example: 'john@school.com' },
                        role:     { type: 'string', enum: ['superadmin', 'school_admin'] },
                        schoolId: { type: 'string', nullable: true, example: '64abc123def456' },
                        isActive: { type: 'boolean', example: true },
                        createdAt:{ type: 'string', format: 'date-time' },
                        updatedAt:{ type: 'string', format: 'date-time' },
                    },
                },
                // ── School ────────────────────────────────────────────────────
                School: {
                    type: 'object',
                    properties: {
                        _id:      { type: 'string', example: '64abc123def456' },
                        name:     { type: 'string', example: 'Greenwood High' },
                        address:  { type: 'string', example: '123 Oak Street, Nairobi' },
                        phone:    { type: 'string', example: '+254700000000' },
                        email:    { type: 'string', example: 'info@greenwood.ac.ke' },
                        website:  { type: 'string', example: 'https://greenwood.ac.ke' },
                        isActive: { type: 'boolean', example: true },
                        createdAt:{ type: 'string', format: 'date-time' },
                        updatedAt:{ type: 'string', format: 'date-time' },
                    },
                },
                SchoolRequest: {
                    type: 'object',
                    required: ['name', 'address'],
                    properties: {
                        name:    { type: 'string', example: 'Greenwood High' },
                        address: { type: 'string', example: '123 Oak Street, Nairobi' },
                        phone:   { type: 'string', example: '+254700000000' },
                        email:   { type: 'string', format: 'email', example: 'info@greenwood.ac.ke' },
                        website: { type: 'string', example: 'https://greenwood.ac.ke' },
                    },
                },
                PaginatedSchools: {
                    type: 'object',
                    properties: {
                        schools: { type: 'array', items: { $ref: '#/components/schemas/School' } },
                        total:   { type: 'integer', example: 10 },
                        page:    { type: 'integer', example: 1 },
                        limit:   { type: 'integer', example: 20 },
                    },
                },
                // ── Classroom ─────────────────────────────────────────────────
                Classroom: {
                    type: 'object',
                    properties: {
                        _id:       { type: 'string', example: '64abc123def456' },
                        name:      { type: 'string', example: 'Room 101' },
                        schoolId:  { $ref: '#/components/schemas/School' },
                        capacity:  { type: 'integer', example: 30 },
                        resources: { type: 'array', items: { type: 'string' }, example: ['projector', 'whiteboard'] },
                        isActive:  { type: 'boolean', example: true },
                        createdAt: { type: 'string', format: 'date-time' },
                        updatedAt: { type: 'string', format: 'date-time' },
                    },
                },
                ClassroomRequest: {
                    type: 'object',
                    required: ['name', 'capacity'],
                    properties: {
                        name:      { type: 'string', example: 'Room 101' },
                        schoolId:  { type: 'string', description: 'Required for superadmin. Inferred from token for school_admin.', example: '64abc123def456' },
                        capacity:  { type: 'integer', example: 30 },
                        resources: { type: 'array', items: { type: 'string' }, example: ['projector', 'whiteboard'] },
                    },
                },
                PaginatedClassrooms: {
                    type: 'object',
                    properties: {
                        classrooms: { type: 'array', items: { $ref: '#/components/schemas/Classroom' } },
                        total:      { type: 'integer', example: 5 },
                        page:       { type: 'integer', example: 1 },
                        limit:      { type: 'integer', example: 20 },
                    },
                },
                // ── Student ───────────────────────────────────────────────────
                Student: {
                    type: 'object',
                    properties: {
                        _id:         { type: 'string', example: '64abc123def456' },
                        firstName:   { type: 'string', example: 'Alice' },
                        lastName:    { type: 'string', example: 'Kamau' },
                        email:       { type: 'string', example: 'alice@example.com' },
                        dateOfBirth: { type: 'string', format: 'date', example: '2010-03-15' },
                        schoolId:    { $ref: '#/components/schemas/School' },
                        classroomId: { $ref: '#/components/schemas/Classroom' },
                        isEnrolled:  { type: 'boolean', example: true },
                        createdAt:   { type: 'string', format: 'date-time' },
                        updatedAt:   { type: 'string', format: 'date-time' },
                    },
                },
                StudentRequest: {
                    type: 'object',
                    required: ['firstName', 'lastName', 'email'],
                    properties: {
                        firstName:   { type: 'string', example: 'Alice' },
                        lastName:    { type: 'string', example: 'Kamau' },
                        email:       { type: 'string', format: 'email', example: 'alice@example.com' },
                        dateOfBirth: { type: 'string', format: 'date', example: '2010-03-15' },
                        schoolId:    { type: 'string', description: 'Required for superadmin. Inferred from token for school_admin.', example: '64abc123def456' },
                        classroomId: { type: 'string', nullable: true, example: '64def456abc789' },
                    },
                },
                TransferRequest: {
                    type: 'object',
                    required: ['targetSchoolId'],
                    properties: {
                        targetSchoolId:    { type: 'string', example: '64xyz789abc123' },
                        targetClassroomId: { type: 'string', nullable: true, example: '64uvw456def789' },
                    },
                },
                PaginatedStudents: {
                    type: 'object',
                    properties: {
                        students: { type: 'array', items: { $ref: '#/components/schemas/Student' } },
                        total:    { type: 'integer', example: 50 },
                        page:     { type: 'integer', example: 1 },
                        limit:    { type: 'integer', example: 20 },
                    },
                },
            },
            // ── Reusable parameters ───────────────────────────────────────────
            parameters: {
                pageParam: {
                    name: 'page', in: 'query', schema: { type: 'integer', default: 1 },
                    description: 'Page number',
                },
                limitParam: {
                    name: 'limit', in: 'query', schema: { type: 'integer', default: 20 },
                    description: 'Results per page',
                },
                idParam: {
                    name: 'id', in: 'path', required: true,
                    schema: { type: 'string' }, description: 'MongoDB ObjectId',
                },
            },
            // ── Reusable responses ────────────────────────────────────────────
            responses: {
                Unauthorized: {
                    description: 'Missing or invalid token',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
                Forbidden: {
                    description: 'Insufficient role permissions',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
                NotFound: {
                    description: 'Resource not found',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
                Conflict: {
                    description: 'Duplicate resource',
                    content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } },
                },
            },
        },
        // Apply bearer auth globally — individual routes can override
        security: [{ bearerAuth: [] }],
        tags: [
            { name: 'Auth',       description: 'Authentication and token management' },
            { name: 'Schools',    description: 'School CRUD — superadmin write, any admin read' },
            { name: 'Classrooms', description: 'Classroom CRUD — scoped to school for school_admin' },
            { name: 'Students',   description: 'Student enrollment, management, and transfer' },
            { name: 'Users',      description: 'Admin user management — superadmin only' },
            { name: 'System',     description: 'Health check' },
        ],
        paths: {
            // ── Health ────────────────────────────────────────────────────────
            '/health': {
                get: {
                    tags: ['System'],
                    summary: 'Health check',
                    security: [],
                    responses: {
                        200: {
                            description: 'Service is healthy',
                            content: { 'application/json': { schema: {
                                type: 'object',
                                properties: {
                                    ok:      { type: 'boolean', example: true },
                                    service: { type: 'string', example: 'school-api' },
                                },
                            }}},
                        },
                    },
                },
            },

            // ── Auth ──────────────────────────────────────────────────────────
            '/api/auth/login': {
                post: {
                    tags: ['Auth'], summary: 'Login', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/LoginRequest' } } } },
                    responses: {
                        200: { description: 'Login successful', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, {
                                properties: { data: { $ref: '#/components/schemas/LoginResponse' } },
                            }],
                        }}}},
                        401: { description: 'Invalid credentials', content: { 'application/json': { schema: { $ref: '#/components/schemas/ErrorResponse' } } } },
                    },
                },
            },
            '/api/auth/register': {
                post: {
                    tags: ['Auth'], summary: 'Create a school_admin user',
                    description: '**Superadmin only.** Creates a new school administrator account.',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/RegisterRequest' } } } },
                    responses: {
                        200: { description: 'User created', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/User' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: { $ref: '#/components/responses/Forbidden' },
                        409: { $ref: '#/components/responses/Conflict' },
                    },
                },
            },
            '/api/auth/refresh': {
                post: {
                    tags: ['Auth'], summary: 'Refresh short token', security: [],
                    requestBody: { required: true, content: { 'application/json': { schema: {
                        type: 'object', required: ['longToken'],
                        properties: { longToken: { type: 'string', description: '30-day token from login' } },
                    }}}},
                    responses: {
                        200: { description: 'New short token issued', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: {
                                type: 'object', properties: { shortToken: { type: 'string' } },
                            }}}],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                    },
                },
            },
            '/api/auth/me': {
                get: {
                    tags: ['Auth'], summary: 'Get current user profile',
                    responses: {
                        200: { description: 'User profile', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/User' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                    },
                },
            },

            // ── Schools ───────────────────────────────────────────────────────
            '/api/schools': {
                get: {
                    tags: ['Schools'], summary: 'List all schools',
                    parameters: [
                        { $ref: '#/components/parameters/pageParam' },
                        { $ref: '#/components/parameters/limitParam' },
                    ],
                    responses: {
                        200: { description: 'Paginated school list', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/PaginatedSchools' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                    },
                },
                post: {
                    tags: ['Schools'], summary: 'Create a school',
                    description: '**Superadmin only.**',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SchoolRequest' } } } },
                    responses: {
                        201: { description: 'School created', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/School' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: { $ref: '#/components/responses/Forbidden' },
                        409: { $ref: '#/components/responses/Conflict' },
                    },
                },
            },
            '/api/schools/{id}': {
                get: {
                    tags: ['Schools'], summary: 'Get school by ID',
                    description: 'School admins are automatically redirected to their own school.',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    responses: {
                        200: { description: 'School found', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/School' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
                put: {
                    tags: ['Schools'], summary: 'Update a school',
                    description: '**Superadmin only.**',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/SchoolRequest' } } } },
                    responses: {
                        200: { description: 'School updated', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/School' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: { $ref: '#/components/responses/Forbidden' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
                delete: {
                    tags: ['Schools'], summary: 'Soft-delete a school',
                    description: '**Superadmin only.** Sets isActive to false.',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    responses: {
                        200: { description: 'School deleted' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: { $ref: '#/components/responses/Forbidden' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
            },

            // ── Classrooms ────────────────────────────────────────────────────
            '/api/classrooms': {
                get: {
                    tags: ['Classrooms'], summary: 'List classrooms',
                    description: 'School admins only see classrooms from their own school.',
                    parameters: [
                        { name: 'schoolId', in: 'query', schema: { type: 'string' }, description: 'Filter by school (superadmin only)' },
                        { $ref: '#/components/parameters/pageParam' },
                        { $ref: '#/components/parameters/limitParam' },
                    ],
                    responses: {
                        200: { description: 'Paginated classroom list', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/PaginatedClassrooms' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                    },
                },
                post: {
                    tags: ['Classrooms'], summary: 'Create a classroom',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ClassroomRequest' } } } },
                    responses: {
                        201: { description: 'Classroom created', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/Classroom' } } }],
                        }}}},
                        400: { description: 'Missing required fields' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { description: 'School not found' },
                        409: { $ref: '#/components/responses/Conflict' },
                    },
                },
            },
            '/api/classrooms/{id}': {
                get: {
                    tags: ['Classrooms'], summary: 'Get classroom by ID',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    responses: {
                        200: { description: 'Classroom found', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/Classroom' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
                put: {
                    tags: ['Classrooms'], summary: 'Update a classroom',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/ClassroomRequest' } } } },
                    responses: {
                        200: { description: 'Classroom updated' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
                delete: {
                    tags: ['Classrooms'], summary: 'Soft-delete a classroom',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    responses: {
                        200: { description: 'Classroom deleted' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
            },

            // ── Students ──────────────────────────────────────────────────────
            '/api/students': {
                get: {
                    tags: ['Students'], summary: 'List students',
                    description: 'School admins only see students from their own school.',
                    parameters: [
                        { name: 'schoolId',    in: 'query', schema: { type: 'string' }, description: 'Filter by school (superadmin only)' },
                        { name: 'classroomId', in: 'query', schema: { type: 'string' }, description: 'Filter by classroom' },
                        { $ref: '#/components/parameters/pageParam' },
                        { $ref: '#/components/parameters/limitParam' },
                    ],
                    responses: {
                        200: { description: 'Paginated student list', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/PaginatedStudents' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                    },
                },
                post: {
                    tags: ['Students'], summary: 'Enroll a new student',
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentRequest' } } } },
                    responses: {
                        201: { description: 'Student enrolled', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/Student' } } }],
                        }}}},
                        400: { description: 'Missing required fields' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { description: 'School or classroom not found' },
                        409: { $ref: '#/components/responses/Conflict' },
                    },
                },
            },
            '/api/students/{id}': {
                get: {
                    tags: ['Students'], summary: 'Get student by ID',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    responses: {
                        200: { description: 'Student found', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/Student' } } }],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
                put: {
                    tags: ['Students'], summary: 'Update student profile',
                    description: 'Cannot change schoolId via this endpoint — use /transfer instead.',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/StudentRequest' } } } },
                    responses: {
                        200: { description: 'Student updated' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
                delete: {
                    tags: ['Students'], summary: 'Unenroll a student',
                    description: 'Sets isEnrolled to false (soft delete).',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    responses: {
                        200: { description: 'Student unenrolled' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
            '/api/students/{id}/transfer': {
                post: {
                    tags: ['Students'], summary: 'Transfer student to another school',
                    description: 'School admins can only transfer students from their own school.',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    requestBody: { required: true, content: { 'application/json': { schema: { $ref: '#/components/schemas/TransferRequest' } } } },
                    responses: {
                        200: { description: 'Student transferred', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: { $ref: '#/components/schemas/Student' } } }],
                        }}}},
                        400: { description: 'Missing targetSchoolId' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        404: { description: 'Student or target school not found' },
                    },
                },
            },

            // ── Users ─────────────────────────────────────────────────────────
            '/api/users': {
                get: {
                    tags: ['Users'], summary: 'List all users',
                    description: '**Superadmin only.**',
                    parameters: [
                        { name: 'role',     in: 'query', schema: { type: 'string', enum: ['superadmin', 'school_admin'] } },
                        { name: 'schoolId', in: 'query', schema: { type: 'string' } },
                        { $ref: '#/components/parameters/pageParam' },
                        { $ref: '#/components/parameters/limitParam' },
                    ],
                    responses: {
                        200: { description: 'User list', content: { 'application/json': { schema: {
                            allOf: [{ $ref: '#/components/schemas/SuccessResponse' }, { properties: { data: {
                                type: 'array', items: { $ref: '#/components/schemas/User' },
                            }}}],
                        }}}},
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: { $ref: '#/components/responses/Forbidden' },
                    },
                },
            },
            '/api/users/{id}': {
                delete: {
                    tags: ['Users'], summary: 'Deactivate a user',
                    description: '**Superadmin only.** Sets isActive to false.',
                    parameters: [{ $ref: '#/components/parameters/idParam' }],
                    responses: {
                        200: { description: 'User deactivated' },
                        401: { $ref: '#/components/responses/Unauthorized' },
                        403: { $ref: '#/components/responses/Forbidden' },
                        404: { $ref: '#/components/responses/NotFound' },
                    },
                },
            },
        },
    },
    apis: [], // paths defined inline above
};

module.exports = swaggerJsdoc(options);
