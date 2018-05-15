var needle = require('needle');
var parser = require('xml2json');

module.exports = {

    friendlyName: 'Rest cmd',

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
            defaultsTo: null
        },
        timeout: {
            type: 'number',
            defaultsTo: 2000,
            description: 'Amount of time allowed for waiting for a connection, a response header, and response data (each).'
        }
    },

    fn: async function (inputs, exits) {
        var endstring = ''; // appends at the end of a REST call, say, if arg was supplied
        // arg supplied? Load it in memory.
        if (typeof inputs.arg != 'undefined' && inputs.arg !== null)
            endstring = '&arg=' + inputs.arg;
        // Query REST
        needle('get', Meta['A'].radiodj + '/opt?auth=' + sails.config.custom.restAuth + '&command=' + inputs.command + endstring, {}, {open_timeout: inputs.timeout, response_timeout: inputs.timeout, read_timeout: inputs.timeout})
                .then(async function (resp) {
                    try {
                        var json2 = parser.toJson(resp.body);
                        return exits.success(json2);
                    } catch (e) {
                        return exits.error(e);
                    }
                })
                // We do not want code execution to fail for an error in calling REST. So instead, log the error but resolve with an empty success response.
                .catch(async function (err) {
                    await Logs.create({logtype: 'REST', loglevel: 'warn', event: 'REST command was called for instance ' + Meta['A'].radiodj + ' with command ' + inputs.command + endstring + ' with ERROR. ' + err.message})
                            .intercept((err) => {
                            });
                    return exits.success();
                });
    }


};

