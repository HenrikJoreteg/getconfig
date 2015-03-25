var Fs = require('fs');
var Path = require('path');

var internals = {};
internals.devAliases = ['dev', 'devel', 'develop', 'development'];

internals.merge = function (target, source) {

    var keys = Object.keys(source);
    for (var i = 0, il = keys.length; i < il; ++i) {
        var key = keys[i];
        if (target.hasOwnProperty(key) &&
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
        var stat = Fs.statSync(path);
        return stat.isDirectory();
    }
    catch (e) {
        return false;
    }
};

internals.findConfig = function (root) {

    root = root || (require.main ? Path.dirname(require.main.filename) : process.cwd());
    var path = Path.join(root, 'config');
    if (internals.isDir(path)) {
        return path;
    }

    if (Path.dirname(root) === root) {
        throw new Error('Unable to find a config directory');
    }

    return internals.findConfig(Path.dirname(root));
};

internals.tryRequire = function (root, type) {

    var path = Path.join(root, type);
    if (root === './') {
        path = root + path;
    }

    var result = {};
    try {
        result.value = require(path);
    }
    catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            result.notfound = true;
        }
        else {
            throw e;
        }
    }

    return result;
};

internals.init = function () {

    var root = process.env.GETCONFIG_ROOT ? Path.resolve(process.cwd(), process.env.GETCONFIG_ROOT) : internals.findConfig();

    var failed = 0;
    var config = {};
    var types = ['default'];
    if (process.env.NODE_ENV) {
        types.push(process.env.NODE_ENV);
        config.getconfig = {
            env: process.env.NODE_ENV
        };
    }
    else {
        types = types.concat(internals.devAliases);
        config.getconfig = {
            env: 'dev',
            isDev: true
        };
    }
    types.push('local');

    for (var i = 0, il = types.length; i < il; ++i) {
        var attempt = internals.tryRequire(root, types[i]);
        if (attempt.notfound) {
            ++failed;
            continue;
        }

        internals.merge(config, attempt.value);
    }

    if (failed === types.length) {
        throw new Error('No config files found');
    }

    return config;
};

module.exports = internals.init();
