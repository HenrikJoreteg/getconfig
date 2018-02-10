'use strict';

const Fs = require('fs');
const Path = require('path');

const Errors = require('./errors');
const Types = require('./types');

const internals = {};

internals.processEnv = function (cfg) {

    for (const key in cfg) {
        if (typeof cfg[key] === 'object' &&
            cfg[key] !== null) {

            cfg[key] = internals.processEnv(cfg[key]);
        }
        else if (typeof cfg[key] === 'string') {
            let interpolate = false;
            let required = true;
            let original;
            let name;
            let type;
            let arg = '';

            let match = /^(\$\$?)([A-Z0-9_]+)(?:::([^\s:]+):?([^\s]+)?)?$/.exec(cfg[key]);
            if (!match) {
                match = /\$\{([A-Z0-9_]+)\}/.exec(cfg[key]);
                if (!match) {
                    continue;
                }
                interpolate = true;
                [original, name] = match;
            }
            else {
                [,required, name, type, arg = ''] = match;
                required = required.length === 1;
            }

            if (!process.env[name]) {
                if (required) {
                    throw new Errors.UnsetEnvVarError(name);
                }
                delete cfg[key];
                continue;
            }

            if (!type) {
                if (interpolate) {
                    cfg[key] = cfg[key].replace(original, process.env[name]);
                }
                else {
                    cfg[key] = process.env[name];
                }
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


internals.processRefs = function (cfg, root) {

    for (const key in cfg) {
        if (typeof cfg[key] === 'object' &&
            cfg[key] !== null) {

            cfg[key] = internals.processRefs(cfg[key], root);
        }
        else if (typeof cfg[key] === 'string') {
            const match = /\$\{self\.([^}]+)\}/.exec(cfg[key]);
            if (!match) {
                continue;
            }

            const [original, path] = match;
            let pointer = root;
            for (const segment of path.split('.')) {
                if (!pointer.hasOwnProperty(segment)) {
                    throw new Errors.MissingPropertyError(path);
                }

                pointer = pointer[segment];
            }

            if (cfg[key] === original) {
                cfg[key] = pointer;
            }
            else {
                cfg[key] = cfg[key].replace(original, pointer);
            }
        }
    }

    return cfg;
};


internals.merge = function (target, source) {

    for (const key in source) {
        if (target.hasOwnProperty(key) &&
            !Array.isArray(target[key]) &&
            typeof target[key] === 'object' &&
            typeof source[key] === 'object' &&
            source[key] !== null) {

            internals.merge(target[key], source[key]);
            continue;
        }

        target[key] = source[key];
    }
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


internals.findConfig = function (root) {

    const locate = function (start) {

        const path = Path.join(start, 'config');
        if (internals.isDir(path)) {
            return path;
        }

        if (Path.dirname(start) === start) {
            throw new Errors.DirNotFoundError();
        }

        return locate(Path.dirname(start));
    };

    if (root) {
        return locate(root);
    }

    if (require.main) {
        try {
            return locate(Path.dirname(require.main.filename));
        }
        catch (err) {
            return locate(process.cwd());
        }
    }

    return locate(process.cwd());
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

    const config = ['default', 'all', ...currentEnv, 'local'].reduce((acc, env) => {

        const cfg = internals.require(root, env);
        if (!cfg.notfound) {
            if (!['default', 'all', 'local'].includes(env)) {
                acc.result.getconfig.env = env;
            }
            acc.found = true;
            internals.merge(acc.result, internals.processEnv(cfg.value));
        }

        return acc;
    }, { result: { getconfig: { env: process.env.NODE_ENV || 'dev', isDev: isDev || devEnvirons.includes(process.env.NODE_ENV) } }, found: false });

    if (!config.found) {
        throw new Errors.FileNotFoundError();
    }

    internals.processRefs(config.result, config.result);

    return config.result;
};


module.exports = internals.init();
