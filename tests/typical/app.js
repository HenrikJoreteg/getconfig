var config = require('../../getconfig.js');

var assert = require('assert');
var NODE_ENV = process.env.NODE_ENV || 'dev';

if (NODE_ENV === 'dev') {
    assert.equal(config.getconfig.env, 'dev');
    assert.equal(config.testValue, 'dev-value');
}

if (NODE_ENV === 'test') {
    assert.equal(config.getconfig.env, 'test');
    assert.equal(config.testValue, 'test-value');
}

console.log('All tests passed');
