#getconfig - config fetcher for node.js

Managing configs for different environments is kind of a pain. 

In short I wanted it to:
- Be simple to understand and use
- Use `NODE_ENV` environment variable to grab appropriate config
- Let me just go `var config = require('getconfig')` from anywhere in the app and have it Just Work™
- Allow using different formats (via require hooks)


## How to use

1. `npm install getconfig`
2. Create a `config/default.json` file in the same folder as the main entry point (usually project root)
3. Just require getconfig like so from anywhere in your project:

```js
var config = require('getconfig');

```
4. That's it!


## Where to put your config and what to call it

Getconfig looks for a config directory in the same folder as the main entry point of your app. Your configuration files should be contained within that directory.

The configuration files attempted by require, in order, are:
- `config/default`
- `config/{{NODE_ENV}}`
- `config/local`

Note that we don't list extensions, that's because the files are loaded via node's `require` mechanism, so anything node can require will work.

In the event that `NODE_ENV` is not set, getconfig will attempt to load `dev`, `devel`, `develop`, and `development` in its place.

## Explicitly setting the config location

In certain circumstances, when your app isn't run directly (e.g. test runners) getconfig may not be able to lookup your config file properly. In this case, you can set a `GETCONFIG_ROOT` environment variable to the directory where your config directory is located.


getconfig will always fill in the `getconfig.env` value in your resulting config object with the current environment name so you can programatically determine the environment if you'd like. If no `NODE_ENV` is set it will also set `getconfig.isDev` to `true`.


## Changelog

- `2.0.0`
    - Total refactor, now stores config files in a directory and merges them on top of each other for simplicity.
- `1.0.0`
    - Bumping major to get out of `0.x.x` range per semver conventions. 
    - `dev` enviroments now look for related config files. So if you've set your `$NODE_ENV` to `development` and it will still find a file called `dev_config.json`.
- `0.3.0` - Switching from JSON.parse to ALCE to allow single quotes and comments. Better readme.


## License

MIT

if you dig it follow [@HenrikJoreteg](http://twitter.com/henrikjoreteg) and/or [@quitlahok](http://twitter.com/quitlahok) on twitter.
