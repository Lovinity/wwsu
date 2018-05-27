/* global sails, Directors, Timesheet */

var moment = require('moment');

module.exports = {

    friendlyName: 'Timesheet / Edit',

    description: 'Edit a timesheet entry.',

    inputs: {
        admin: {
            type: 'string',
            required: true,
            description: 'The login of an admin authorized to edit timesheets.'
        },

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
        sails.log.debug('Controller timesheet/edit called.');
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {
            // Get the director as provided by admin
            var record = await Directors.findOne({login: inputs.admin})
                    .intercept((err) => {
                        sails.log.error(err);
                        return exits.error();
                    });
            sails.log.silly(record);

            // Director not found or is not an admin? Forbidden request.
            if (typeof record === 'undefined' || record.length <= 0 || !record.admin)
                return exits.forbidden();

            // Update the timesheet record
            await Timesheet.update({ID: inputs.ID}, {time_in: moment(inputs.time_in).toISOString(), time_out: moment(inputs.time_out).toISOString, approved: inputs.approved})
                    .intercept((err) => {
                        sails.log.error(err);
                        return exits.error();
                    });

            // Force a re-load of all directors to update any possible changes in presence
            await Directors.updateDirectors(true);

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
