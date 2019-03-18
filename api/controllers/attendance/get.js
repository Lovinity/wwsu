/* global moment, sails, Attendance, Djs */

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
            type: 'number',
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
        sails.log.debug('Controller attendance/get called.');

        try {
            var query = {};

            // No DJ nor event? Filter by date.
            if ((!inputs.dj || inputs.dj === null) && (!inputs.event || inputs.event === null))
            {
                // Subscribe to sockets if applicable
                if (this.req.isSocket)
                {
                    sails.sockets.join(this.req, 'attendance');
                    sails.log.verbose('Request was a socket. Joining attendance.');
                }

                var start = inputs.date && inputs.date !== null ? moment(inputs.date).startOf('day') : moment().startOf('day');
                var end = moment(start).add(1, 'days');
                query = {or: [{scheduledStart: {'>=': start.toISOString(true), '<': end.toISOString(true)}}, {actualStart: {'>=': start.toISOString(true), '<': end.toISOString(true)}}]};
                
            } else {

                if (inputs.dj && inputs.dj !== null)
                {
                    query.dj = inputs.dj;
                }

                if (inputs.event && inputs.event !== null)
                    query.event = {'contains': inputs.event};
            }

            // Get records
            var records = await Attendance.find(query);

            if (records)
            {
                // We want to sort by actualStart if not null, else scheduledStart if not null, else ID. We can't do that in ORM, so use a compare function instead.
                var compare = function (a, b) {
                    var theDateA = a.actualStart !== null ? a.actualStart : a.scheduledStart;
                    var theDateB = b.actualStart !== null ? b.actualStart : b.scheduledStart;
                    if (moment(theDateA).valueOf() < moment(theDateB).valueOf())
                        return -1;
                    if (moment(theDateA).valueOf() > moment(theDateB).valueOf())
                        return 1;
                    if (a.ID > b.ID)
                        return 1;
                    if (b.ID > a.ID)
                        return -1;
                    return 0;
                };

                records.sort(compare);
            }

            sails.log.verbose(`Special records returned: ${records.length}`);
            sails.log.silly(records);

            return exits.success(records);

        } catch (e) {
            return exits.error(e);
        }

    }


};
