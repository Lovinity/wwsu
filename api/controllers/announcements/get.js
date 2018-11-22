/* global sails, Announcements */

module.exports = {

    friendlyName: 'Announcements / Get',

    description: 'Get announcements for the specified type. Subscribe to receive websockets for announcements event.',

    inputs: {
        type: {
            type: 'string',
            required: true,
            description: 'Return announcements of the specified type; ensure websockets only include announcements of this type. Use "all" to return all announcements, but do not subscribe to a websocket.'
        },
        ID: {
            type: 'number',
            allowNull: true,
            description: "If provided, will only return the announcement matching this ID. If provided, type is ignored (but still required, so use all), and websockets is not subscribed."
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller announcements/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Determine which announcements to return; do not subscribe to websockets for "all" type
            if (inputs.type !== "all" && (!inputs.ID || inputs.ID === null))
            {
                var records = await Announcements.find({type: inputs.type});
            } else if (!inputs.ID || inputs.ID === null) {
                var records = await Announcements.find();
            } else {
                var records = await Announcements.findOne({ID: inputs.ID});
            }

            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, `announcements-${inputs.type}`);
                sails.log.verbose(`Request was a socket. Joined announcements-${inputs.type}.`);
            }

            sails.log.verbose(`${records.length} records retrieved.`);
            sails.log.silly(records);

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
