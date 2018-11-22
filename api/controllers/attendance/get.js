/* global moment, sails, Attendance */

module.exports = {

    friendlyName: 'attendance / get',

    description: 'Retrieve attendance records.',

    inputs: {
        date: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            allowNull: true,
            description: `moment() parsable string of a date to get logs.`
        },
        dj: {
            type: 'string',
            allowNull: true,
            description: `Retrieve attendance records for the specified DJ. If provided, date is ignored.`
        },
        event: {
            type: 'string',
            allowNull: true,
            description: `Return attendance records where this string is contained within the record's event field. If provided, date is ignored. If DJ is provided, will further filter by the DJ.`
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller logs/get-attendance called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            var query = {};
            // No DJ nor event? Filter by date.
            if ((inputs.dj === null || inputs.dj === '') && (inputs.event === null || inputs.event === ''))
            {
                // Subscribe to sockets if applicable
                if (this.req.isSocket)
                {
                    sails.sockets.join(this.req, 'attendance');
                    sails.log.verbose('Request was a socket. Joining attendance.');
                }
                
                var start = inputs.date !== null ? moment(inputs.date).startOf('day') : moment().startOf('day');
                var end = moment(start).add(1, 'days');
                query = {createdAt: {'>=': start.toISOString(true), '<': end.toISOString(true)}};
            } else {
                if (inputs.dj && inputs.dj !== null && inputs.dj !== '')
                    query.DJ = inputs.dj;

                if (inputs.event && inputs.event !== null && inputs.event !== '')
                    query.event = {'contains': inputs.event};
            }

            // Get records
            var records = await Attendance.find(query).sort("createdAt ASC");

            sails.log.verbose(`Special records returned: ${records.length}`);
            sails.log.silly(records);

            return exits.success(records);

        } catch (e) {
            return exits.error(e);
        }

    }


};
