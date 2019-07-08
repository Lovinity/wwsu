module.exports = {

    friendlyName: 'analytics/weekly-dj',

    description: 'Gather an object of weekly statistics about DJs and OnAir programming. Also subscribes to the socket event analytics-weekly-dj.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller analytics/weekly-dj called.');

        // If socket, subscribe to receive changes to analytics
        if (this.req.isSocket)
        {
            sails.sockets.join(this.req, 'analytics-weekly-dj');
            sails.log.verbose('Request was a socket. Joining analytics-weekly-dj.');
        }

        // Return current analytics
        return exits.success(Attendance.weeklyAnalytics);

    }


};
