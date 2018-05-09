var needle = require('needle');
var parser = require('xml2json');

// WORK ON ERROR HANDLING
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
        }
    },

    fn: async function (inputs, exits) {
        var endstring = ''; // appends at the end of a REST call, say, if arg was supplied
        // arg supplied? Load it in memory.
        if (typeof inputs.arg != 'undefined' && inputs.arg !== null)
            endstring = '&arg=' + inputs.arg;
        // Query REST
        needle('get', Meta['A'].radiodj + '/opt?auth=' + sails.config.custom.restAuth + '&command=' + inputs.command + endstring)
                .then(async function (resp) {
                    try {
                        var json2 = parser.toJson(resp.body);
                        return exits.success(json2);
                    } catch (e) {
                        return exits.error(e);
                    }
                })
                .catch(function (err) {
                    return exits.error(err);
                });
    }


};

