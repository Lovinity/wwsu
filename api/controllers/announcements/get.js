/* global sails, Announcements */

module.exports = {

    friendlyName: 'Announcements / Get',

    description: 'Get announcements for the specified type. Subscribe to receive websockets for announcements event.',

    inputs: {
        type: {
            type: 'string',
            required: true,
            description: 'Return announcements of the specified type; ensure websockets only include announcements of this type.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller announcements/get called.');
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {

            var records = await Announcements.find({type: inputs.type});

            sails.log.verbose(`${records.length} records retrieved.`);
            sails.log.silly(records);

            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, `announcements-${inputs.type}`);
                sails.log.verbose(`Request was a socket. Joined announcements-${inputs.type}.`);
            }

            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }

    }


};
