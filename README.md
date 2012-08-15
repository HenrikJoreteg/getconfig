#getconfig - config reader for node.js

### Why, what, how?
This little config reader uses the `NODE_ENV` environment variable to determine the execution environment we're in and then reads a file that matches that name. 

It will then look for a config file with the corresponding name at the root of your project.

Valid environments and config file names are as follows:

- `dev` - dev_config.json
- `stage` - stage_config.json
- `production` - production_config.json

### How to use it

1. install via npm: 

    ```bash
    npm install getconfig
    ```

2. create your config file, for example:

    ```json
    {
        "databasePassword": "something long and silly",
        "andbangClientId": "my-client-id"
    }
    ```

3. get your config: 

    ```js

    // just requiring 'getconfig' will fetch and parse your JSON config
    // based on your environment. 
    var config = require('getconfig')

    // so you can just use it
    connectToDatabase(config.databasePassword);
    ```

### License

MIT

if you dig it follow [@HenrikJoreteg](http://twitter.com/henrikjoreteg) on twitter.