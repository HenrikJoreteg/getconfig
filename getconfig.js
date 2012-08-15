var fs = require('fs'),
    env = process.env.NODE_ENV || 'dev',
    colors = require('colors'),
    color, 
    config,
    path;

// set our color based on environment
if (env === 'dev') {
    color = 'red';
} else if (env === 'stage') {
    color = 'blue';
} else if (env === 'production') {
    color = 'green';
} else {
    throw new Error("NODE_ENV must be one 'dev', 'production' or 'stage'. You have '%s'.", env);
}

// build a file path to the config
path = __dirname + '/../../' + env + '_config.json';

// try to read it
try {
    config = fs.readFileSync(path, 'utf-8');
} catch (e) {
    console.error("No config file found for %s".red, env);
    console.error("We couldn't find anything at: %s".grey, path);
    throw e;
}

try {
    config = JSON.parse(config);
} catch (e) {
    console.error("Invalid JSON file".red);
    console.error("Check it at:".grey + " http://jsonlint.com".blue);
    throw e;
}

// log out what we've got
console.log(env[color].bold + ' environment detected'.grey);

// export it
module.exports = config;