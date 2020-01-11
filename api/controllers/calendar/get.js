module.exports = {

    friendlyName: 'Calendar / Get',

    description: 'Get all calendar events and exceptions to use in CalendarDb. Also subscribe to sockets.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/get called.')
        try {
            // Grab only active events
            var calendarRecords = await sails.models.calendar.find({active: true});

            // Subscribe to sockets if applicable
            if (this.req.isSocket) {
                sails.sockets.join(this.req, 'calendar')
                sails.log.verbose('Request was a socket. Joining calendar.')
            }

            var exceptionRecords = await sails.models.calendarexceptions.find();

            // Subscribe to sockets if applicable
            if (this.req.isSocket) {
                sails.sockets.join(this.req, 'calendarexceptions')
                sails.log.verbose('Request was a socket. Joining calendarexceptions.')
            }

            return { calendar: calendarRecords, exceptions: exceptionRecords };
        } catch (e) {
            return exits.error(e)
        }
    }

}
