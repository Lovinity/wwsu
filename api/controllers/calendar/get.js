module.exports = {

    friendlyName: 'Calendar / Get',

    description: 'Get the events from WWSU Google Calendar.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/get called.');
        try {
            // Grab events
            var records = await Calendar.find();
            sails.log.verbose(`Calendar records retrieved: ${records.length}`);

            // Subscribe to sockets if applicable
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'calendar');
                sails.log.verbose('Request was a socket. Joining calendar.');
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
