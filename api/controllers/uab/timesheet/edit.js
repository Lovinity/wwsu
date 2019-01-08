/* global sails, Directors, Timesheet, moment */

module.exports = {

    friendlyName: 'uab / Timesheet / Edit',

    description: 'Edit a timesheet entry.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the Timesheet being edited.'
        },

        time_in: {
            type: 'string',
            required: true,
            custom: function (value) {
                return moment(value).isValid();
            },
            description: 'A moment.js compatible timestamp for when the director clocked in.'
        },

        time_out: {
            type: 'string',
            allowNull: true,
            custom: function (value) {
                return value === null || value === '' || moment(value).isValid();
            },
            description: 'A moment.js compatible timestamp for when the director clocked out. Use null or blank string to indicate the director is still clocked in.'
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
            await Uabtimesheet.update({ID: inputs.ID}, {time_in: moment(inputs.time_in).toISOString(true), time_out: moment(inputs.time_out).toISOString(true), approved: inputs.approved}).fetch();

            // Force a re-load of all directors to update any possible changes in presence
            await Uabdirectors.updateDirectors();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
