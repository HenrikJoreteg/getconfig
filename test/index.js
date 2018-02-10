'use strict';

const Path = require('path');
const { spawnSync } = require('child_process');
const { describe, it } = exports.lab = require('lab').script();
const { expect } = require('code');

const internals = {};
internals.command = 'node';
internals.options = { encoding: 'utf8', shell: true };
internals.args = (app) => {

    const code = `
    try {
      var config = require('${app}');
      console.log(JSON.stringify(config));
    }
    catch (err) {
      console.log(JSON.stringify({ message: err.message, code: err.code }));
    }
    `;

    return ['-e', `"${code}"`];
};

internals.custom = () => {

    const code = `
      require('./types').custom = (val, arg1, arg2) => {
        if (arg1 === 'err') {
          throw new Error('kaboom');
        }
        return { val, arg1, arg2 };
      };

      try {
        var config = require('./');
        console.log(JSON.stringify(config));
      }
      catch (err) {
        console.log(JSON.stringify({ message: err.message, code: err.code }));
      }
    `;

    return ['-e', `"${code}"`];
};

describe('directories', () => {

    it('throws DirNotFoundError when no config directory exists', () => {

        const app = spawnSync(internals.command, internals.args('./'), internals.options);
        const error = JSON.parse(app.stdout);
        expect(error.code).to.equal('EDIRNOTFOUND');
    });

    it('throws FileNotFoundError when directory exists but contains no configs', () => {

        const app = spawnSync(internals.command, internals.args('../../../'), Object.assign({}, internals.options, { cwd: Path.join(__dirname, 'fixtures', 'empty') }));
        const error = JSON.parse(app.stdout);
        expect(error.code).to.equal('EFILENOTFOUND');
    });

    it('respects CODE_LOCATION env var for finding config', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'simple') } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ some: 'value', getconfig: { isDev: true } });
    });

    it('respects LAMBDA_TASK_ROOT env var for finding config', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { LAMBDA_TASK_ROOT: Path.join(__dirname, 'fixtures', 'simple') } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ some: 'value', getconfig: { isDev: true } });
    });

    it('allows overriding config directory path with GETCONFIG_ROOT', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { GETCONFIG_ROOT: Path.join(__dirname, 'fixtures', 'simple', 'config') } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ some: 'value', getconfig: { isDev: true } });
    });
});

describe('files', () => {

    it('loads default, dev, devel, develop, development, and local when NODE_ENV is unset', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app') } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ default: true, dev: true, devel: true, develop: true, development: true, local: true, getconfig: { isDev: true, env: 'development' } });
    });

    it('loads default, test, and local when NODE_ENV is test', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'test' } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ default: true, test: true, local: true, getconfig: { isDev: false, env: 'test' } });
    });

    it('sets getconfig.env even when the requested env is not a specific file', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'notarealenv' } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ default: true, local: true, getconfig: { isDev: false, env: 'notarealenv' } });
    });

    it('processes the "all" layer for any NODE_ENV', () => {

        let app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'test', DEFAULT_OVERRIDE: 'false' } }));
        let config = JSON.parse(app.stdout);
        expect(config).to.equal({ default: false, test: true, local: true, getconfig: { isDev: false, env: 'test' } });

        app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'production', DEFAULT_OVERRIDE: 'false' } }));
        config = JSON.parse(app.stdout);
        expect(config).to.equal({ default: false, local: true, getconfig: { isDev: false, env: 'production' } });
    });
});

describe('environment variables', () => {

    it('fails with EUNSETENVVAR when a required environment variable is not set', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'required' } }));
        const error = JSON.parse(app.stdout);
        expect(error.code).to.equal('EUNSETENVVAR');
    });

    it('populates environment variables when defined', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'required', REQUIRED: 'required' } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ default: true, required: 'required', local: true, getconfig: { isDev: false, env: 'required' } });
    });

    it('removes optional environment variables when not set', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'optional' } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ default: true, local: true, getconfig: { isDev: false, env: 'optional' } });
    });

    it('populates optional environment variables when set', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'optional', OPTIONAL: 'optional' } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ default: true, optional: 'optional', local: true, getconfig: { isDev: false, env: 'optional' } });
    });

    it('interpolates environment variables', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'interpolate', VAR: 'basic' } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({ default: true, local: true, basic: 'some basic interpolation', getconfig: { isDev: false, env: 'interpolate' } });
    });

    it('fails with EUNSETENVVAR when attempting to interpolate an unset environment variable', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'interpolate' } }));
        const error = JSON.parse(app.stdout);
        expect(error.code).to.equal('EUNSETENVVAR');
    });

    it('interpolates and/or copies self references', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'reference' } }));
        const config = JSON.parse(app.stdout);
        expect(config).to.equal({
            default: true,
            local: true,
            value: 'reference',
            shallow: 'some reference',
            a: {
                deeper: {
                    value: 'test'
                }
            },
            deep: 'deep test',
            copied: {
                deeper: {
                    value: 'test'
                }
            },
            getconfig: { isDev: false, env: 'reference' }
        });
    });

    it('fails with EMISSINGPROPERTY when attempting to interpolate a missing self reference', () => {

        const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'badref' } }));
        const error = JSON.parse(app.stdout);
        expect(error.code).to.equal('EMISSINGPROPERTY');
    });
});

describe('types', () => {

    describe('arrays', () => {

        it('can coerce string arrays', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', ARRAY: 'one,two' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, array: ['one', 'two'], local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('can coerce boolean arrays', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN_ARRAY: 'true,false' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, booleanArray: [true, false], local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('can coerce date arrays', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', DATE_ARRAY: '0,0' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.contain({ default: true, local: true, getconfig: { isDev: false, env: 'types' } });
            const date = new Date(0);
            expect(config.dateArray.map((d) => new Date(d))).to.equal([date, date]);
        });

        it('can coerce number arrays', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', NUMBER_ARRAY: '3,5' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, numberArray: [3, 5], local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('can coerce object arrays', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', OBJECT_ARRAY: '{"object":"one"},{"object":"two"}' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, objectArray: [{ object: 'one' }, { object: 'two' }], local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('can coerce regex arrays', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', REGEX_ARRAY: 'one,two' } }));
            const config = JSON.parse(app.stdout);
            // again, this is ugly but a JSON stringified & parsed regex becomes an empty object
            expect(config).to.equal({ default: true, regexArray: [{}, {}], local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('returns ECONVERSION when attempting to coerce an array of invalid type', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', INVALID_ARRAY: 'invalid,invalid' } }));
            const error = JSON.parse(app.stdout);
            expect(error.code).to.equal('ECONVERSION');
        });
    });

    describe('booleans', () => {

        it('coerces "true" to true', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'true' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: true, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces "t" to true', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 't' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: true, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces "yes" to true', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'yes' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: true, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces "y" to true', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'y' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: true, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces "on" to true', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'on' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: true, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces 1 to true', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: '1' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: true, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces "false" to false', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'false' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: false, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces "f" to false', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'f' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: false, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces "no" to false', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'no' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: false, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces "n" to false', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'n' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: false, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces "off" to false', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'off' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: false, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('coerces 0 to false', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: '0' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, boolean: false, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('returns ECONVERSION for other values', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', BOOLEAN: 'invalid' } }));
            const error = JSON.parse(app.stdout);
            expect(error.code).to.equal('ECONVERSION');
        });
    });

    describe('dates', () => {

        it('coerces numeric timestamps to dates', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', DATE: '0' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.contain({ default: true, local: true, getconfig: { isDev: false, env: 'types' } });
            expect(new Date(config.date)).to.equal(new Date(0));
        });

        it('coerces string timestamps to dates', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', DATE: '1970-01-01T00:00:00.000Z' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.contain({ default: true, local: true, getconfig: { isDev: false, env: 'types' } });
            expect(new Date(config.date)).to.equal(new Date('1970-01-01T00:00:00.000Z'));
        });

        it('returns ECONVERSION for invalid date values', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', DATE: 'invalid' } }));
            const error = JSON.parse(app.stdout);
            expect(error.code).to.equal('ECONVERSION');
        });
    });

    describe('numbers', () => {

        it('coerces numbers', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', NUMBER: '5' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, number: 5, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('returns ECONVERSION for non-numeric values', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', NUMBER: 'invalid' } }));
            const error = JSON.parse(app.stdout);
            expect(error.code).to.equal('ECONVERSION');
        });
    });

    describe('objects', () => {

        it('coerces objects', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', OBJECT: '{"test":"object"}' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, object: { test: 'object' }, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('returns ECONVERSION for invalid objects', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', OBJECT: '{"test"' } }));
            const error = JSON.parse(app.stdout);
            expect(error.code).to.equal('ECONVERSION');
        });
    });

    describe('regexes', () => {

        it('coerces regexes', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', REGEX: 'test' } }));
            const config = JSON.parse(app.stdout);
            // this is ugly, but regex objects JSON parse to an empty object
            expect(config).to.equal({ default: true, regex: {}, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('returns ECONVERSION for invalid regexes', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', REGEX: '(test' } }));
            const error = JSON.parse(app.stdout);
            expect(error.code).to.equal('ECONVERSION');
        });
    });

    describe('invalid', () => {

        it('returns EINVALIDTYPE for invalid types', () => {

            const app = spawnSync(internals.command, internals.args('./'), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', INVALID: 'invalid' } }));
            const error = JSON.parse(app.stdout);
            expect(error.code).to.equal('EINVALIDTYPE');
        });
    });

    describe('custom', () => {

        it('allows custom types', () => {

            const app = spawnSync(internals.command, internals.custom(), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', CUSTOM: 'custom' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, custom: { val: 'custom', arg1: 'one', arg2: 'two' }, local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('allows arrays of custom types', () => {

            const app = spawnSync(internals.command, internals.custom(), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', CUSTOM_ARRAY: 'one,two' } }));
            const config = JSON.parse(app.stdout);
            expect(config).to.equal({ default: true, customArray: [{ val: 'one', arg1: 'one', arg2: 'two' }, { val: 'two', arg1: 'one', arg2: 'two' }], local: true, getconfig: { isDev: false, env: 'types' } });
        });

        it('returns ECONVERSION when custom types throw any error', () => {

            const app = spawnSync(internals.command, internals.custom(), Object.assign({}, internals.options, { env: { CODE_LOCATION: Path.join(__dirname, 'fixtures', 'app'), NODE_ENV: 'types', CUSTOM_ERROR: 'custom' } }));
            const error = JSON.parse(app.stdout);
            expect(error.code).to.equal('ECONVERSION');
        });
    });
});
