/* global sails, Hosts */
var
        jwt = require('jsonwebtoken'),
        cryptoRandomString = require('crypto-random-string');
sails.tokenSecret = cryptoRandomString(256);
module.exports = {

    friendlyName: 'hosts / get',

    description: 'Retrieve data about a specified host. Also provides an array of otherHosts, and subscribes to the hosts socket, if the host parameter is an admin host.',

    inputs: {
        host: {
            type: 'string',
            required: true,
            description: 'The host name to search for or authorize.'
        }
    },

    exits: {
        success: {
            statusCode: 200
        },
        notFound: {
            statusCode: 404
        },
        error: {
            statusCode: 500
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller hosts/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Find the hosts record
            var record = await Hosts.findOne({host: inputs.host});
            sails.log.silly(record);

            if (!record)
                return exits.notFound();

            /*
             record.token = await jwt.sign(// Sign and generate an authorization token
             {id: record.ID},
             sails.tokenSecret, // Token Secret that we sign it with
             {
             expiresIn: (60 * 60) // Token Expire time (1 hour)
             });
             */

            // Subscribe to websockets if applicable
            if (record.authorized && this.req.isSocket && record.admin)
            {
                sails.sockets.join(this.req, 'hosts');
                sails.log.verbose('Request was a socket on an authorized admin. Joined hosts.');

                // Push the current hosts
                var records = await Hosts.find();
                record.otherHosts = records;
            }

            return exits.success(record);
        } catch (e) {
            return exits.error(e);
        }

    }


};
