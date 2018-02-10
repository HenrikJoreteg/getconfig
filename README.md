# getconfig - config fetcher for node.js

Managing configs for different environments is kind of a pain.

In short I wanted it to:
- Be simple to understand and use
- Use `NODE_ENV` environment variable to grab appropriate config
- Let me just go `const config = require('getconfig')` from anywhere in the app and have it Just Work™
- Allow using different formats (via require hooks)


## How to use

1. `npm install getconfig`
2. Create a `config/default.json` (or `config/default.js`, anything you can `require()` will work) file in the same folder as the main entry point (usually project root)
3. Just require getconfig like so from anywhere in your project:

```js
const Config = require('getconfig');
```

4. That's it!


## Where to put your config and what to call it

Getconfig looks for a config directory in the same folder as the main entry point of your app. Your configuration files should be contained within that directory.

The configuration files attempted by require, in order, are:
- `config/default`
- `config/all`
- `config/{{NODE_ENV}}`
- `config/local`

Note that we don't list extensions, that's because the files are loaded via node's `require` mechanism, so anything node can require will work.

In the event that `NODE_ENV` is not set, getconfig will attempt to load `dev`, `devel`, `develop`, and `development` in its place.

## Environment variables

In a lot of situations it's simpler to pass configuration via environment variables, rather than hardcoding it into a config file.

Fortunately, `getconfig` can fill those in for you. Just set the value of a key to reference the environment variable and it will be expanded inline. For example:

```json
{
    "envVariable": "$ENV_VAR"
}
```

Note that this will *only* work for environment variables whose names are within the character set of A-Z, 0-9, and _ (underscore). This is to prevent collisions with things like complex strings that may start with a `$`.

Environment variables can be made optional by specifying a second `$` in the value's name, such as:

```json
{
    "envVariable": "$$ENV_VAR"
}
```

When an optional environment variable is unspecified, it is _removed_ from that layer of configuration. This allows you to specify a default in `config/default` and an optional value in `config/dev`, and if the optional value in `config/dev` is unset the value from `config/default` will be used.

Required environment variables may be used in string interpolation like so:

```json
{
    "envVariable": "some ${ENV_VAR}"
}
```

However when used in interpolation like the above, _no type conversions will be applied_.

Additionally, since all environment variables are strings, getconfig can also perform type coercion for you by specifying a `::type` suffix. The following types are supported out of the box:

```json
{
    "stringArray": "$STRING_ARRAY_VALUE::array",
    "boolean": "$BOOL_VALUE::boolean",
    "booleanArray": "$BOOLEAN_ARRAY_VALUE::array:boolean",
    "date": "$DATE_VALUE::date",
    "dateArray": "$DATE_ARRAY_VALUE::array:date",
    "number": "$NUMBER_VALUE::number",
    "numberArray": "$NUMBER_ARRAY_VALUE::array:number",
    "object": "$OBJECT_VALUE::object",
    "objectArray": "$OBJECT_ARRAY_VALUE::array:object",
    "regex": "$REGEX_VALUE::regex",
    "regexArray": "$REGEX_ARRAY_VALUE::array:regex"
}
```

The `array` type is special in that it accepts an optional argument specified by an additional `:type` suffix, that allows creating an array of a typed value.

In addition to the built in types, it is possible to add your own types like so:

```js
const Errors = require('getconfig/errors');
const Types = require('getconfig/types');

Types.custom = function (val, arg1, arg2) {
    // do some conversion here
    return val;
    // throw new Errors.ConversionError(); // if something failed
};

const Config = require('getconfig');
```

You can then use `::custom` as a suffix in your config and environment variables will be processed through your custom function. If your custom function accepts arguments (in the example above `arg1` and `arg2`) they can be passed like so `$$ENV_VAR::custom:arg:arg`. Note that every argument will be passed as a string and it is up to your custom function to handle them appropriately.

## Self references

Your configuration can also reference variables within itself as part of string interpolation, so a config file like the following is valid:

```json
{
    "port": "$PORT::number",
    "host": "$HOSTNAME",
    "url": "http://${self.host}:${self.port}
}
```

This allows you to define a variable once and reuse it in multiple places. This has the same limitations as string interpolation with environment variables however, it will not apply type conversions, and the value referenced must exist. You can refer to deeper keys by using a dot as a path separator like so:

```json
{
    "some": {
        "deep": {
            "value": "here"
        }
    },
    "top": "${self.some.deep.value}"
}
```

Note that if the contents of a self referencing key is only the reference (i.e. `${self.value}` vs `http://${self.value}`) the reference will be _copied_ not interpolated. This allows you to reference objects in multiple places like so:

```json
{
    "postgres": {
        "user": "pg",
        "database": "test"
    },
    "clientOne": {
        "database": "${self.postgres}"
    },
    "clientTwo": {
        "database": "${self.postgres}"
    }
}
```

In the above example, the `database` key under both `clientOne` and `clientTwo` will be a _reference_ to the top level `postgres` object, simplifying configuration reuse.

## Explicitly setting the config location

In certain circumstances, when your app isn't run directly (e.g. test runners) getconfig may not be able to lookup your config file properly. In this case, you can set a `GETCONFIG_ROOT` environment variable to the directory where your config files are located.

### Cloud Functions

When used in a Google Cloud Function or an AWS Lambda function, getconfig will use the `CODE_LOCATION` or `LAMBDA_TASK_ROOT` environment variable, respectively, to automatically locate the appropriate root. This means that you can include your `config` directory in your function deployment and things should work as you would expect them to.

Note: Google Cloud Functions automatically set `NODE_ENV` to `"production"` when deployed, however Lambda leaves `NODE_ENV` unset by default.


## Environment

getconfig will always fill in the `getconfig.env` value in your resulting config object with the current environment name so you can programatically determine the environment if you'd like. If no `NODE_ENV` is set it will also set `getconfig.isDev` to `true`.

## CLI

getconfig also includes a small helper tool for debugging and inserting values from your config into shell scripts and the like, it can be used like:

```
getconfig [path] config.value
```

The `path` parameter is optional and allows you to define the root of your project, the default is the current working directory. The second parameter is the path within the config to print.


## Changelog
- `4.4.0`
    - Add the `all` layer, which loads before the `NODE_ENV` layer but after `default` and can help eliminate the need for multiple files with the same contents.
- `4.3.0`
    - Include a CLI tool.
- `4.2.0`
    - Allow self references to work correctly outside of string interpolation.
- `4.1.0`
    - Support string interpolation of environment variables and self references.
- `4.0.0`
    - Total rewrite, now supports optional environment variables as well as type coercion and custom type processors.
- `3.1.0`
    - Supports Google Cloud Functions and AWS Lambda functions out of the box.
- `3.0.0`
    - Does not merge arrays from config layers, instead overwrites them entirely with the topmost config's array.
- `2.0.0`
    - Total refactor, now stores config files in a directory and merges them on top of each other for simplicity.
- `1.0.0`
    - Bumping major to get out of `0.x.x` range per semver conventions.
    - `dev` enviroments now look for related config files. So if you've set your `$NODE_ENV` to `development` and it will still find a file called `dev_config.json`.
- `0.3.0` - Switching from JSON.parse to ALCE to allow single quotes and comments. Better readme.


## License

MIT

if you dig it follow [@HenrikJoreteg](http://twitter.com/henrikjoreteg) and/or [@quitlahok](http://twitter.com/quitlahok) on twitter.
