/* global sails, Meta, Logs, needle */

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
            defaultsTo: 2000,
            description: 'Amount of time allowed for waiting for a connection, a response header, and response data (each). If this value is set to 0, the promise will resolve immediately without waiting for needle to finish, and will assume 10000 for needle timeout.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper rest.cmd called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
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

        // Query REST
        try {
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
        } catch (e) {
            return exits.success(false);
        }
    }


};

