module.exports = {

    friendlyName: 'Uab / Timesheet / Add',

    description: 'Add a timesheet entry for a UAB director.',

    inputs: {
        timestamp: {
            type: 'string',
            required: true,
            custom: function (value) {
                return DateTime.fromISO(value).isValid;
            },
            description: 'An ISO String for the timesheet entry.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller uab/timesheet/add called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {

            // Get the director
            var record = await sails.models.uabdirectors.findOne({name: this.req.payload.name});
            sails.log.silly(record);

            // No director? return not found.
            if (typeof record === 'undefined' || record.length <= 0)
                return exits.notFound();

            // If the director is present, this is a clock-out entry.
            if (record.present)
            {
                var toapprove = false;
                thetime = DateTime.fromISO(inputs.timestamp);

                // If the entry is less than 30 minutes off from the current time, approve automatically
                if (thetime > DateTime.local().minus({minutes: 30}) && thetime < DateTime.local().plus({minutes: 30}))
                    toapprove = true;

                // Add the timeOut entry
                await sails.models.uabtimesheet.update({timeIn: {'!=': null}, timeOut: null, name: record.name}, {timeOut: thetime.toISO(), approved: toapprove}).fetch();

                // Update the director presence
                await sails.models.uabdirectors.update({ID: record.ID}, {present: false, since: thetime.toISO()})
                        .fetch();

            } else { // If the director is not present, this is a clock-in entry.
                var toapprove = false;
                thetime = DateTime.fromISO(inputs.timestamp);

                // If the entry is less than 30 minutes off from the current time, approve automatically
                if (thetime > DateTime.local().minus({minutes: 30}) && thetime < DateTime.local().plus({minutes: 30}))
                    toapprove = true;

                // Clock-ins need a new entry
                await sails.models.uabtimesheet.create({name: record.name, timeIn: thetime.toISO(), approved: toapprove}).fetch();

                // Update the director presence
                await sails.models.uabdirectors.update({ID: record.ID}, {present: true, since: thetime.toISO()})
                        .fetch();
            }
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
