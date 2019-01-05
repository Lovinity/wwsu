/* global sails, Hosts */
var
        jwt = require('jsonwebtoken'),
        cryptoRandomString = require('crypto-random-string');
sails.tokenSecret = cryptoRandomString(256);
module.exports = {

    friendlyName: 'hosts / get',

    description: 'Retrieve data about a specified host. Also authorizes and returns a token if the host is an authorized host.',

    inputs: {
        host: {
            type: 'string',
            required: true,
            description: 'The host name to search for or authorize. If the host does not exist, one will be created.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller hosts/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Find or create the hosts record
            var record = await Hosts.findOrCreate({host: inputs.host}, {host: inputs.host, friendlyname: await sails.helpers.recipients.generateNick()});
            sails.log.silly(record);

            if (record.authorized)
            {
                record.token = await jwt.sign(// Sign and generate an authorization token
                        {id: record.ID},
                        sails.tokenSecret, // Token Secret that we sign it with
                        {
                            expiresIn: (60 * 60) // Token Expire time (1 hour)
                        });

                // Subscribe to websockets if applicable
                if (this.req.isSocket && record.admin)
                {
                    sails.sockets.join(this.req, 'hosts');
                    sails.log.verbose('Request was a socket on an authorized admin. Joined hosts.');
                    
                    // Push the current hosts
                    var records = await Hosts.find();
                    record.otherHosts = records;
                }
            } else {
                record.token = null;
            }

            return exits.success(record);
        } catch (e) {
            return exits.error(e);
        }

    }


};
