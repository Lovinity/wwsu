/* global sails, moment, Announcements */

module.exports = {

    friendlyName: 'Announcements / Add',

    description: 'Add an announcement.',

    inputs: {
        type: {
            type: 'string',
            required: true,
            description: 'The type of announcement; determines which subsystems receive the announcement.'
        },
        
        level: {
            type: 'string',
            required: true,
            isIn: ['danger', 'urgent', 'warning', 'info', 'success', 'primary', 'secondary'],
            description: 'Announcement warning level. Must be danger, yrgent, warning, info, success, primary, or secondary.'
        },
        
        announcement: {
            type: 'string',
            required: true,
            description: 'The announcement text.'
        },
        
        starts: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            allowNull: true,
            description: `moment() parsable string of when the announcement starts. Defaults to now. Recommended ISO string.`
        },

        expires: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            allowNull: true,
            description: `moment() parsable string of when the announcement expires. Defaults to the year 3000. Recommended ISO string.`
        }

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller announcements/add called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            
            await Announcements.create({type: inputs.type, level: inputs.level, announcement: inputs.announcement, starts: inputs.starts !== null && typeof inputs.starts !== 'undefined' ? moment(inputs.starts).toISOString(true) : moment().toISOString(true), expires: inputs.expires !== null && typeof inputs.expires !== 'undefined' ? moment(inputs.expires).toISOString(true) : moment({year: 3000}).toISOString(true)}).fetch();
            
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }

};
