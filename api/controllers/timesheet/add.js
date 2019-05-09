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
                var toapprove = 0;
                thetime = moment(inputs.timestamp);

                // If the entry is less than 30 minutes off from the current time, approve automatically
                if (thetime.isAfter(moment().subtract(30, 'minutes')) && thetime.isBefore(moment().add(30, 'minutes')))
                    toapprove = 1;

                // Add the time_out entry
                await Timesheet.update({time_in: {'!=': null}, time_out: null, name: record.name}, {time_out: thetime.toISOString(true), approved: toapprove}).fetch();

                // Update the director presence
                await Directors.update({ID: record.ID}, {present: false, since: thetime.toISOString(true)})
                        .fetch();

            } else { // If the director is not present, this is a clock-in entry.
                var toapprove = 0;
                thetime = moment(inputs.timestamp);

                // Check if an office hours record exists.
                var calendar = await Directorhours.find({director: record.name, active: {'>=': 1}, start: {"<=": moment().toISOString(true)}, end: {">=": moment().toISOString(true)}}).limit(1);

                // If the entry is less than 30 minutes off from the current time, approve automatically
                if (thetime.isAfter(moment().subtract(30, 'minutes')) && thetime.isBefore(moment().add(30, 'minutes')))
                    toapprove = 1;

                // Clock-ins need a new entry
                if (calendar.length > 0)
                {
                    var records = await Timesheet.update({unique: calendar[0].unique, time_in: null}, {name: record.name, unique: calendar[0].unique, time_in: thetime.toISOString(true), approved: toapprove}).fetch();
                    if (records.length === 0)
                        await Timesheet.create({name: record.name, unique: calendar[0].unique, time_in: thetime.toISOString(true), approved: toapprove}).fetch();
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
