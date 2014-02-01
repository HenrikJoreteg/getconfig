var ALCE = require('alce'),
    fs = require('fs'),
    path = require('path'),
    env = process.env.NODE_ENV || 'dev',
    colors = require('colors'),
    useColor = true,
    silent = false,
    color,
    config,
    configRoot,
    configPath;

// set our color based on environment
if (env === 'dev') {
    color = 'red';
} else if (env === 'test') {
    color = 'yellow';
} else if (env === 'production') {
    color = 'green';
} else {
    color = 'blue';
}

// color
function c(str, color) {
    return useColor ? str[color] : str;
}

// build a file path to the config
configRoot = process.env.GETCONFIG_ROOT || (require.main ? path.dirname(require.main.filename) : ".");
configPath = configRoot + path.sep + env + '_config.json';

// try to read it
try {
    config = fs.readFileSync(configPath, 'utf-8');
} catch (e) {
    console.error(c("No config file found for %s", 'red'), env);
    console.error(c("We couldn't find anything at: %s", 'grey'), configPath);
    config = "{}";
}

try {
    // use ALCE to parse to allow comments/single quotes
    config = ALCE.parse(config);
    if (config.getconfig) {
        if (config.getconfig.hasOwnProperty('colors')) useColor = config.getconfig.colors;
        if (config.getconfig.hasOwnProperty('silent')) silent = config.getconfig.silent;
    } else {
        config.getconfig = {};
    }
    config.getconfig.env = env;

} catch (e) {
    console.error(c("Invalid JSON file", 'red'));
    console.error(c("Check it at:", 'grey') + c(" http://jsonlint.com", 'blue'));
    throw e;
}

// log out what we've got
if (!silent) console.log(c(c(env, color), 'bold') + c(' environment detected', 'grey'));

// export it
module.exports = config;
