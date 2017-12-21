'use strict';

const Fs = require('fs');
const Path = require('path');

const Errors = require('./errors');
const Types = require('./types');

const internals = {};

internals.process = function (cfg) {

    for (const key in cfg) {
        if (typeof cfg[key] === 'object' &&
            cfg[key] !== null) {

            cfg[key] = internals.process(cfg[key]);
        }
        else if (typeof cfg[key] === 'string') {
            const match = /^(\$\$?)([A-Z0-9_]+)(?:::([^\s:]+):?([^\s]+)?)?$/.exec(cfg[key]);
            if (!match) {
                continue;
            }

            let [,required, name, type, arg = ''] = match;
            required = required.length === 1;

            if (!process.env[name]) {
                if (required) {
                    throw new Errors.UnsetEnvVarError(name);
                }
                delete cfg[key];
                continue;
            }

            if (!type) {
                cfg[key] = process.env[name];
                continue;
            }

            if (!Types.hasOwnProperty(type)) {
                throw new Errors.InvalidTypeError(type);
            }

            try {
                cfg[key] = Types[type](process.env[name], ...arg.split(':'));
            }
            catch (err) {
                throw new Errors.ConversionError(name, type, err);
            }
        }
    }

    return cfg;
};


internals.isDir = function (path) {

    try {
        return Fs.statSync(path).isDirectory();
    }
    catch (err) {
        return false;
    }
};


internals.require = function (root, env) {

    let path = Path.join(root, env);
    if (root === './') {
        path = root + path;
    }

    const result = {};
    try {
        result.value = require(path);
    }
    catch (err) {
        if (err.code === 'MODULE_NOT_FOUND') {
            result.notfound = true;
        }
        else {
            throw err;
        }
    }

    return result;
};


internals.findConfig = function (_root) {

    const root = _root || (require.main ? Path.dirname(require.main.filename) : process.cwd());
    const path = Path.join(root, 'config');
    if (internals.isDir(path)) {
        return path;
    }

    if (Path.dirname(root) === root) {
        throw new Errors.DirNotFoundError();
    }

    return internals.findConfig(Path.dirname(root));
};


internals.init = function () {

    const override = process.env.CODE_LOCATION ?
        Path.join(process.env.CODE_LOCATION, 'config') :
        (process.env.LAMBDA_TASK_ROOT ?
            Path.join(process.env.LAMBDA_TASK_ROOT, 'config') :
            process.env.GETCONFIG_ROOT);

    const root = override ? Path.resolve(process.cwd(), override) : internals.findConfig();
    const isDev = !process.env.hasOwnProperty('NODE_ENV');
    const devEnvirons = ['dev', 'devel', 'develop', 'development'];
    const currentEnv = isDev ? devEnvirons : [process.env.NODE_ENV];

    const config = ['default', ...currentEnv, 'local'].reduce((acc, env) => {

        const cfg = internals.require(root, env);
        if (!cfg.notfound) {
            if (!['default', 'local'].includes(env)) {
                acc.result.getconfig.env = env;
            }
            acc.found = true;
            acc.result = Object.assign(acc.result, internals.process(cfg.value));
        }

        return acc;
    }, { result: { getconfig: { isDev: isDev || devEnvirons.includes(process.env.NODE_ENV) } }, found: false });

    if (!config.found) {
        throw new Errors.FileNotFoundError();
    }

    return config.result;
};


module.exports = internals.init();
