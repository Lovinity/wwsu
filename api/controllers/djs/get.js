/* global sails, Xp, Djs */

module.exports = {

    friendlyName: 'djs / get',

    description: 'Retrieve a list of DJs in the system.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller djs/get called.');

        try {
            
            // Grab DJs
            var records = await Djs.find();
            
            // Remove login information from the records
            records = records.map(record => {
                delete record.login;
                return record;
            });

            sails.log.verbose(`DJ records retrieved: ${records.length}`);

            // Subscribe to sockets if applicable
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'djs');
                sails.log.verbose('Request was a socket. Joining djs.');
            }

            // Return records
            if (!records || records.length < 1)
            {
                return exits.success([]);
            } else {
                return exits.success(records);
            }

        } catch (e) {
            return exits.error(e);
        }

    }


};
