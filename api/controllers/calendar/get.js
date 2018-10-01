/* global Calendar, sails */

module.exports = {

    friendlyName: 'Calendar / Get',

    description: 'Get the events from WWSU Google Calendar for the next 7 days.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/get called.');
        try {
            var records = await Calendar.find({status: {"!=": -1}});
            sails.log.verbose(`Calendar records retrieved: ${records.length}`);
            sails.log.silly(records);
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'calendar');
                sails.log.verbose('Request was a socket. Joining calendar.');
            }
            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};
