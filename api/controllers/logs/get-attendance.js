/* global moment, sails, Logs */

module.exports = {

    friendlyName: 'logs / get-attendance',

    description: 'Retrieve attendance records.',

    inputs: {
        date: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            allowNull: true,
            description: `moment() parsable string of a date to get logs.`
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller logs/get-attendance called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Get date range
            if (inputs.date !== null)
            {
                var start = inputs.date !== null ? moment(inputs.date).startOf('day') : moment().startOf('day');
                var end = moment(start).add(1, 'days');
                var query = {or: [{createdAt: {">=": start.toISOString(true)}}, {createdAt: {"<=": end.toISOString(true)}}]};
            } else {
                var query = {};
            }

            // Get records
            var records = await Attendance.find(query).sort("createdAt DESC");

            sails.log.verbose(`Special records returned: ${records.length}`);
            sails.log.silly(records);

            return exits.success(records);

        } catch (e) {
            return exits.error(e);
        }

    }


};



