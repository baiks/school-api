'use strict';
const config  = require('./config/index.config.js');
const Cortex  = require('ion-cortex');
const ManagersLoader = require('./loaders/ManagersLoader.js');

const cortex = new Cortex({
    prefix: config.dotEnv.CORTEX_PREFIX,
    url: config.dotEnv.CORTEX_REDIS,
    type: config.dotEnv.CORTEX_TYPE,
    state: () => ({}),
    activeDelay: "50ms",
    idlDelay: "200ms",
});

const managersLoader = new ManagersLoader({ config, cortex });
const managers = managersLoader.load();

managers.userServer.run();
