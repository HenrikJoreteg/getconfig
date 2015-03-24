var Hoek = require('hoek');
var Path = require('path');

var internals = {};
internals.devAliases = ['dev', 'devel', 'develop', 'development'];

internals.tryRequire = function (root, type) {

    var path = Path.join(root, 'config', type);
    if (root === './') {
        path = root + path;
    }

    var result;
    try {
        result = require(path);
    }
    catch (e) {
        if (e.code === 'MODULE_NOT_FOUND') {
            result = {};
        }
        else {
            throw e;
        }
    }

    return result;
};

internals.init = function () {

    var root = process.env.GETCONFIG_ROOT || (require.main ? Path.dirname(require.main.filename) : './');

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
        Hoek.merge(config, internals.tryRequire(root, types[i]));
    }

    return config;
};

module.exports = internals.init();
