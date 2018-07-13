/* global sails, Directors, Timesheet, moment */

module.exports = {

    friendlyName: 'Timesheet / Add',

    description: 'Add a timesheet entry for a director.',

    inputs: {
        login: {
            type: 'string',
            required: true,
            description: 'Username of the director adding the timesheet entry.'
        },

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
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {

            var record = await Directors.findOne({login: inputs.login});
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
                await Timesheet.update({time_out: null, name: record.name}, {time_out: thetime.toISOString(true), approved: toapprove});

                // Update the director presence
                await Directors.update({login: inputs.login}, {present: false, since: thetime.toISOString(true)})
                        .fetch();

            } else { // If the director is not present, this is a clock-in entry.
                var toapprove = false;
                thetime = moment(inputs.timestamp);

                // If the entry is less than 30 minutes off from the current time, approve automatically
                if (thetime.isAfter(moment().subtract(30, 'minutes')) && thetime.isBefore(moment().add(30, 'minutes')))
                    toapprove = true;

                // Clock-ins need a new entry
                await Timesheet.create({name: record.name, time_in: thetime.toISOString(true), approved: toapprove});

                // Update the director presence
                await Directors.update({login: inputs.login}, {present: true, since: thetime.toISOString(true)})
                        .fetch();
            }
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
