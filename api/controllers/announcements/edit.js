/* global sails, moment, Announcements, _ */

module.exports = {

    friendlyName: 'Announcements / Edit',

    description: 'Edit an existing announcement.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the record to edit.'
        },

        type: {
            type: 'string',
            description: 'The type of announcement; determines which subsystems receive the announcement.'
        },

        level: {
            type: 'string',
            isIn: ['danger', 'warning', 'info', 'success', 'primary', 'secondary'],
            description: 'Announcement warning level. Must be danger, warning, info, success, primary, or secondary.'
        },

        announcement: {
            type: 'string',
            description: 'The announcement text.'
        },

        starts: {
            type: 'string',
            custom: function (value) {
                return value === null || moment(value).isValid();
            },
            allowNull: true,
            description: `moment() parsable string of when the announcement starts. Recommended ISO string.`
        },

        expires: {
            type: 'string',
            custom: function (value) {
                return value === null || moment(value).isValid();
            },
            allowNull: true,
            description: `moment() parsable string of when the announcement expires. Defaults to the year 3000. Recommended ISO string.`
        }

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller announcements/edit called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            
            // Determine what needs updating
            var criteria = {};

            if (inputs.type !== null)
                criteria.type = inputs.type;

            if (inputs.level !== null)
                criteria.level = inputs.level;

            if (inputs.announcement !== null)
                criteria.announcement = inputs.announcement;

            if (inputs.starts !== null)
                criteria.starts = inputs.starts;

            if (inputs.expires !== null)
                criteria.expires = inputs.expires;

            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
            var criteriaB = _.cloneDeep(criteria);

            // Update the announcement
            await Announcements.update({ID: inputs.ID}, criteriaB).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }

};
