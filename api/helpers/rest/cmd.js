/* global sails, Meta, Logs, needle, Songs */

module.exports = {

    friendlyName: 'rest.cmd',

    description: 'Execute a command on the active RadioDJ REST server.',

    inputs: {
        command: {
            type: 'string',
            required: true,
            description: 'Command to send over REST.'
        },
        arg: {
            type: 'ref',
            description: 'If the command takes an argument, arg is that argument.',
            defaultsTo: 0
        },
        timeout: {
            type: 'number',
            defaultsTo: 10000,
            description: 'Amount of time allowed for waiting for a connection, a response header, and response data (each). If this value is set to 0, the promise will resolve immediately without waiting for needle to finish, and will assume 10000 for needle timeout.'
        },
        queue: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, instead of executing right away, this cmd request will be added to a queue where one cmd is executed every execution of the check CRON. In addition, this helper call will not resolve until the cmd is executed in the queue.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper rest.cmd called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        var endstring = ''; // appends at the end of a REST call, say, if arg was supplied
        // arg supplied? Load it in memory.
        if (typeof inputs.arg !== 'undefined' && inputs.arg !== null)
            endstring = '&arg=' + inputs.arg;

        // If timeout is 0, resolve the promise but continue execution (so do not return it).
        if (inputs.timeout === 0)
        {
            exits.success();
            inputs.timeout = 10000;
        }

        try {
            if (!inputs.queue)
            {
                // Query REST
                needle('get', Meta['A'].radiodj + '/opt?auth=' + sails.config.custom.rest.auth + '&command=' + inputs.command + endstring, {}, {open_timeout: inputs.timeout, response_timeout: inputs.timeout, read_timeout: inputs.timeout, headers: {'Content-Type': 'application/json'}})
                        .then(async function (resp) {
                            try {
                                return exits.success(true);
                            } catch (e) {
                                return exits.success(false);
                            }
                        })
                        .catch(async function (err) {
                            return exits.success(false);
                        });
                // Add to queue, triggered by checks CRON, if queue is true
            } else {
                Songs.pendingCmd.push({command: inputs.command, arg: inputs.arg, timeout: inputs.timeout, resolve: exits.success});
                sails.log.verbose(`Put a REST cmd into queue: ${JSON.stringify({command: inputs.command, arg: inputs.arg, timeout: inputs.timeout, resolve: exits.success})}`);
                // Do not resolve yet... when cron triggers this pendingCmd entry, it will then call the resolve function with either true or false as its parameter.
            }
        } catch (e) {
            return exits.success(false);
        }
    }


};

