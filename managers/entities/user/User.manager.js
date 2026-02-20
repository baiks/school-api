'use strict';
const User = require('./User.model.js');

module.exports = class UserManager {
    constructor({ config, tokenManager }) {
        this.config       = config;
        this.tokenManager = tokenManager;
    }

    async register({ username, email, password, role, schoolId }) {
        // Only superadmin role can be created here (school_admin created by superadmin)
        const exists = await User.findOne({ $or: [{ email }, { username }] });
        if (exists) return { error: 'Username or email already taken', code: 409 };

        const user = await User.create({ username, email, password, role: role || 'school_admin', schoolId: schoolId || null });
        return { data: user.toSafeObject() };
    }

    async login({ email, password }) {
        const user = await User.findOne({ email, isActive: true });
        if (!user) return { error: 'Invalid credentials', code: 401 };

        const match = await user.comparePassword(password);
        if (!match) return { error: 'Invalid credentials', code: 401 };

        const longToken  = this.tokenManager.genLongToken({ userId: user._id, role: user.role, schoolId: user.schoolId });
        const shortToken = this.tokenManager.genShortToken({ userId: user._id, role: user.role, schoolId: user.schoolId });

        return { data: { user: user.toSafeObject(), longToken, shortToken } };
    }

    async refreshToken({ longToken }) {
        const { decoded, error } = this.tokenManager.verifyLongToken(longToken);
        if (error) return { error: 'Invalid or expired token', code: 401 };

        const user = await User.findById(decoded.userId);
        if (!user || !user.isActive) return { error: 'User not found or inactive', code: 401 };

        const shortToken = this.tokenManager.genShortToken({ userId: user._id, role: user.role, schoolId: user.schoolId });
        return { data: { shortToken } };
    }

    async getById(id) {
        const user = await User.findById(id).select('-password');
        if (!user) return { error: 'User not found', code: 404 };
        return { data: user };
    }

    async list({ role, schoolId } = {}) {
        const filter = {};
        if (role) filter.role = role;
        if (schoolId) filter.schoolId = schoolId;
        const users = await User.find(filter).select('-password');
        return { data: users };
    }

    async deactivate(id) {
        const user = await User.findByIdAndUpdate(id, { isActive: false }, { new: true }).select('-password');
        if (!user) return { error: 'User not found', code: 404 };
        return { data: user };
    }
};
