module.exports = {

    friendlyName: 'Calendar / Get-schedule',

    description: 'Get all calendar schedules to use in CalendarDb. Also subscribe to sockets.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller calendar/get-schedule called.')
        try {
            var scheduleRecords = await sails.models.schedule.find();

            // Subscribe to sockets if applicable
            if (this.req.isSocket) {
                sails.sockets.join(this.req, 'schedule')
                sails.log.verbose('Request was a socket. Joining schedule.')
            }

            return exits.success(scheduleRecords);
        } catch (e) {
            return exits.error(e)
        }
    }

}
