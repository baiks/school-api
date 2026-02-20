'use strict';
const MongoConnect   = require('../connect/mongo.js');
const UserServer     = require('../managers/http/user/UserServer.manager.js');
const UserManager    = require('../managers/entities/user/User.manager.js');
const SchoolManager  = require('../managers/entities/school/School.manager.js');
const ClassroomManager = require('../managers/entities/classroom/Classroom.manager.js');
const StudentManager = require('../managers/entities/student/Student.manager.js');
const TokenManager   = require('../managers/entities/token/Token.manager.js');
const ResponseDispatcher = require('../managers/ResponseDispatcher.manager.js');

module.exports = class ManagersLoader {
    constructor({ config, cortex }) {
        this.config = config;
        this.cortex = cortex;
    }

    load() {
        const mongo = new MongoConnect({ config: this.config });
        mongo.connect();

        const responseDispatcher = new ResponseDispatcher();
        const tokenManager       = new TokenManager({ config: this.config });
        const userManager        = new UserManager({ config: this.config, tokenManager });
        const schoolManager      = new SchoolManager({ config: this.config });
        const classroomManager   = new ClassroomManager({ config: this.config });
        const studentManager     = new StudentManager({ config: this.config });

        const userServer = new UserServer({
            config: this.config,
            cortex: this.cortex,
            managers: {
                responseDispatcher,
                tokenManager,
                userManager,
                schoolManager,
                classroomManager,
                studentManager,
            },
        });

        return { userServer };
    }
};
