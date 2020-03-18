module.exports = {

    friendlyName: 'uab / Timesheet / Edit',

    description: 'Edit a timesheet entry.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the Timesheet being edited.'
        },

        timeIn: {
            type: 'string',
            required: true,
            custom: function (value) {
                return DateTime.fromISO(value).isValid
            },
            description: 'An ISO string for when the director clocked in.'
        },

        timeOut: {
            type: 'string',
            allowNull: true,
            custom: function (value) {
                return value === null || value === '' || DateTime.fromISO(value).isValid;
            },
            description: 'An ISO String for when the director clocked out. Use null or blank string to indicate the director is still clocked in.'
        },

        approved: {
            type: 'boolean',
            required: true,
            description: 'If true, this timesheet is approved. If false, this timesheet is flagged for approval.'
        }
    },

    exits: {
        forbidden: {
            statusCode: 403
        },
        success: {
            statusCode: 200
        },
        notFound: {
            statusCode: 404
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller uab/timesheet/edit called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Update the timesheet record
            await sails.models.uabtimesheet.update({ID: inputs.ID}, {timeIn: inputs.timeIn, timeOut: inputs.timeOut, approved: inputs.approved}).fetch();

            // Force a re-load of all directors to update any possible changes in presence
            await Uabdirectors.updateDirectors();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
