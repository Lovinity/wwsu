/* global Calendar, sails */

module.exports = {

    friendlyName: 'Calendar / Get',

    description: 'Get the events from WWSU Google Calendar for the next 7 days.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/get called.');
        var records = await Calendar.find()
                .catch((err) => {
                    sails.log.error(err);
                    exits.error();
                });
                sails.log.verbose(`Calendar records retrieved: ${records.length}`);
                sails.log.silly(records);
        if (this.req.isSocket)
        {
            sails.sockets.join(this.req, 'calendar');
            sails.log.verbose('Request was a socket. Joining calendar.');
        }
        return exits.success(records);
    }


};
