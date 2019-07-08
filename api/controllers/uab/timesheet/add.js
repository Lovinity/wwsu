module.exports = {

    friendlyName: 'Uab / Timesheet / Add',

    description: 'Add a timesheet entry for a UAB director.',

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
        sails.log.debug('Controller uab/timesheet/add called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            var toapprove = false;
            // Get the director
            var record = await Uabdirectors.findOne({name: this.req.payload.name});
            sails.log.silly(record);

            // No director? return not found.
            if (typeof record === 'undefined' || record.length <= 0)
                {return exits.notFound();}

            // If the director is present, this is a clock-out entry.
            if (record.present)
            {
                toapprove = false;
                thetime = moment(inputs.timestamp);

                // If the entry is less than 30 minutes off from the current time, approve automatically
                if (thetime.isAfter(moment().subtract(30, 'minutes')) && thetime.isBefore(moment().add(30, 'minutes')))
                    {toapprove = true;}

                // Add the time_out entry
                await Uabtimesheet.update({time_in: {'!=': null}, time_out: null, name: record.name}, {time_out: thetime.toISOString(true), approved: toapprove}).fetch();

                // Update the director presence
                await Uabdirectors.update({ID: record.ID}, {present: false, since: thetime.toISOString(true)})
                        .fetch();

            } else { // If the director is not present, this is a clock-in entry.
                toapprove = false;
                thetime = moment(inputs.timestamp);

                // If the entry is less than 30 minutes off from the current time, approve automatically
                if (thetime.isAfter(moment().subtract(30, 'minutes')) && thetime.isBefore(moment().add(30, 'minutes')))
                    {toapprove = true;}

                // Clock-ins need a new entry
                await Uabtimesheet.create({name: record.name, time_in: thetime.toISOString(true), approved: toapprove}).fetch();

                // Update the director presence
                await Uabdirectors.update({ID: record.ID}, {present: true, since: thetime.toISOString(true)})
                        .fetch();
            }
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
