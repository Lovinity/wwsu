/* global sails, Directors, Timesheet, moment, Directorhours */

module.exports = {

    friendlyName: 'Timesheet / Add',

    description: 'Add a timesheet entry for a director.',

    inputs: {
        timestamp: {
            type: 'string',
            required: true,
            custom: function (value) {
                return moment(value).isValid();
            },
            description: 'A moment.js compatible timestamp for the timesheet entry.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller timesheet/add called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {

            // Get the director
            var record = await Directors.findOne({name: this.req.payload.name});
            sails.log.silly(record);

            // No director? return not found.
            if (typeof record === 'undefined' || record.length <= 0)
                return exits.notFound();

            // If the director is present, this is a clock-out entry.
            if (record.present)
            {
                var toapprove = false;
                thetime = moment(inputs.timestamp);

                // If the entry is less than 30 minutes off from the current time, approve automatically
                if (thetime.isAfter(moment().subtract(30, 'minutes')) && thetime.isBefore(moment().add(30, 'minutes')))
                    toapprove = true;

                // Add the time_out entry
                await Timesheet.update({time_out: null, name: record.name}, {time_out: thetime.toISOString(true), approved: toapprove}).fetch();

                // Update the director presence
                await Directors.update({ID: record.ID}, {present: false, since: thetime.toISOString(true)})
                        .fetch();

            } else { // If the director is not present, this is a clock-in entry.
                var toapprove = false;
                thetime = moment(inputs.timestamp);

                // Check if an office hours record exists. Allow 30 minutes grace.
                var calendar = await Directorhours.find({director: record.name, active: 1, start: {"<=": moment().add(30, 'minutes').toISOString(true)}, end: {">=": moment().toISOString(true)}}).limit(1);

                // If the entry is less than 30 minutes off from the current time, approve automatically
                if (thetime.isAfter(moment().subtract(30, 'minutes')) && thetime.isBefore(moment().add(30, 'minutes')))
                    toapprove = true;

                // Clock-ins need a new entry
                if (calendar.length > 0)
                {
                    await Timesheet.create({name: record.name, unique: calendar[0].unique, scheduled_in: moment(calendar[0].start).toISOString(true), scheduled_out: moment(calendar[0].end).toISOString(true), time_in: thetime.toISOString(true), approved: toapprove}).fetch();
                } else {
                    await Timesheet.create({name: record.name, unique: null, scheduled_in: null, scheduled_out: null, time_in: thetime.toISOString(true), approved: toapprove}).fetch();
                }

                // Update the director presence
                await Directors.update({ID: record.ID}, {present: true, since: thetime.toISOString(true)})
                        .fetch();
            }
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
