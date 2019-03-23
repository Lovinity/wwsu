/* global moment, sails, Timesheet */

module.exports = {

    friendlyName: 'Timesheet / Get',

    description: 'Get a week of timesheet entries.',

    inputs: {
        date: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            allowNull: true,
            description: `moment() parsable string of a date that falls within the week to get timesheet entries. Defaults to now.`
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller timesheet/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            if (!inputs.date || inputs.date === null)
            {
                // Join timesheet socket if applicable
                if (this.req.isSocket)
                {
                    sails.sockets.join(this.req, 'timesheet');
                    sails.log.verbose('Request was a socket. Joining timesheet.');
                }
            }

            // Get a range of one week
            var start = inputs.date !== null ? moment(inputs.date).startOf('week') : moment().startOf('week');
            var end = moment(start).add(1, 'weeks');

            // Get timesheet records
            var records = await Timesheet.find({or: [
                    {time_in: {'>=': start.toISOString(true), '<': end.toISOString(true)}},
                    {time_out: {'>=': start.toISOString(true), '<': end.toISOString(true)}},
                    {time_in: null, time_out: null, scheduled_in: {'>=': start.toISOString(true), '<': end.toISOString(true)}},
                    {time_in: null, time_out: null, scheduled_out: {'>=': start.toISOString(true), '<': end.toISOString(true)}}
                ]}).sort('time_in ASC');
            sails.log.verbose(`Returned Timesheet records: ${records.length}`);
            sails.log.silly(records);

            // return the records
            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }


    }


};
