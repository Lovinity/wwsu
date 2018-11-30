/* global sails, Xp */

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
            // Grab events
            var records = await Djs.find();
            sails.log.verbose(`DJ records retrieved: ${records.length}`);
            sails.log.silly(records);

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
