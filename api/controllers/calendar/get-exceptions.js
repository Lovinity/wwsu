module.exports = {

    friendlyName: 'Calendar / Get-exceptions',

    description: 'Get all calendar exceptions to use in CalendarDb. Also subscribe to sockets.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/get-exceptions called.')
        try {
            var exceptionRecords = await sails.models.calendarexceptions.find();

            // Subscribe to sockets if applicable
            if (this.req.isSocket) {
                sails.sockets.join(this.req, 'calendarexceptions')
                sails.log.verbose('Request was a socket. Joining calendarexceptions.')
            }

            return exits.success(exceptionRecords);
        } catch (e) {
            return exits.error(e)
        }
    }

}
