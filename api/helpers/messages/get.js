/* global Hosts, Messages, sails */

var moment = require('moment');

module.exports = {

    friendlyName: 'messages.get',

    description: 'Retrieve applicable messages sent within the last hour. Do not include emergency messages.',

    inputs: {
        host: {
            type: 'string',
            required: true,
            description: 'Host ID of the client retrieving messages.'
        },
        ip: {
            type: 'string',
            defaultsTo: '10.0.0.1',
            description: 'The IP address of the client'
        },
        socket: {
            type: 'string',
            allowNull: true,
            description: 'The ID of the websocket.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper messages.get called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            var searchto = moment().subtract(1, 'hours').toDate(); // Get messages sent within the last hour
            // First, grab data pertaining to the host that is retrieving messages
            var thehost = await Hosts.findOrCreate({host: inputs.host}, {host: inputs.host, friendlyname: inputs.host})
                    .intercept((err) => {
                        return exits.error(err);
                    });
            sails.log.silly(thehost);

            if (inputs.socket && inputs.socket !== null)
            {
                await sails.helpers.recipients.add(inputs.socket, inputs.host, 'computers', thehost.friendlyname);
            }

            // Get messages
            var records = await Messages.find({status: 'active', or: [{createdAt: {'>': searchto}}, {to: 'emergency'}]})
                    .intercept((err) => {
                        return exits.error(err);
                    });
            sails.log.verbose(`Messages records retrieved: ${records.length}`);
            sails.log.silly(records);
            if (typeof records === 'undefined' || records.length === 0)
            {
                return exits.success([]);
            } else {
                // Remove IP addresses from response!
                records.forEach(function (record, index) {
                    if (typeof records[index].from_IP !== 'undefined')
                        delete records[index].from_IP;
                });
                return exits.success(records);
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

