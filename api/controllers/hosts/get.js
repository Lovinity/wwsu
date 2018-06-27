/* global sails, Hosts */

module.exports = {

    friendlyName: 'hosts / get',

    description: 'Retrieve data about a specified host.',

    inputs: {
        host: {
            type: 'string',
            required: true,
            description: 'The host name to search for. If the host does not exist, one will be created.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller hosts/get called.');
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {
            // Find or create the hosts record
            var record = await Hosts.findOrCreate({host: inputs.host}, {host: inputs.host, friendlyname: inputs.host, requests: 0, emergencies: 0, webmessages: 0});

            sails.log.silly(record);

            return exits.success(record);
        } catch (e) {
            return exits.error(e);
        }

    }


};
