/* global Events, sails */

module.exports = {

    friendlyName: 'Events / Get',

    description: 'Get the events from WWSU Google Calendar for the next 7 days.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller events/get called.');
        var records = await Events.find()
                .intercept((err) => {
                    sails.log.error(err);
                    exits.error();
                });
                sails.log.verbose(`Events records retrieved: ${records.length}`);
                sails.log.silly(records);
        if (this.req.isSocket)
        {
            sails.sockets.join(this.req, 'events');
            sails.log.verbose('Request was a socket. Joining events.');
        }
        return exits.success(records);
    }


};
