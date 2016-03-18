var exec = require('child_process').exec;
var path = require('path');
var test = require('tape');



// Test normal use case
test('It should import properly when require.main is the config root', function (test) {
    exec('NODE_ENV=dev node ' + path.join(__dirname, 'typical', 'app.js'), function (err, stdout, stderr) {
        test.assert(!err, 'did not error');
        var conf = JSON.parse(stdout);
        test.assert(conf.getconfig.env === 'dev', 'loaded the right env');
        test.end();
    });
});



// Test normal use case
test('It should import properly when require.main is not the config root but GETCONFIG_ROOT is set', function (test) {
    var config_path = path.join(__dirname, 'typical', 'config');
    exec('GETCONFIG_ROOT=' + config_path + ' NODE_ENV=dev node ' + path.join(__dirname, 'nonroot', 'app.js'), function (err, stdout, stderr) {
        test.assert(!err, 'did not error');
        var conf = JSON.parse(stdout);
        test.assert(conf.getconfig.env === 'dev', 'loaded the right env');
        test.end();
    });
});

test('It expands environment variables', function (test) {
    exec('NODE_ENV=test node ' + path.join(__dirname, 'typical', 'app.js'), function (err, stdout, stderr) {
        test.assert(!err, 'did not error');
        var conf = JSON.parse(stdout);
        test.assert(conf.testEnv === 'test', 'overwrote testEnv');
        test.assert(conf.deeper.testEnv === 'test', 'overwrote deeper.testEnv');
        test.assert(conf.invalidEnv === '$NotanENV', 'did not overwrite invalidEnv');
        test.end();
    });
});

test('It does not merge arrays', function (test) {
    exec('NODE_ENV=dev node ' + path.join(__dirname, 'typical', 'app.js'), function (err, stdout, stderr) {
        test.assert(!err, 'did not error');
        var conf = JSON.parse(stdout);
        test.assert(conf.array.length === 1, 'only has one item');
        test.assert(conf.array[0] === 'two', 'item comes from top config');
        test.end();
    });
});
