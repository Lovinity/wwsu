/* global sails, moment */

module.exports = {

    friendlyName: 'EAS / Send',

    description: 'Send an alert through the Emergency Alert System as WWSU.',

    inputs: {
        counties: {
            type: 'string',
            required: true,
            description: 'This alert applies to this comma-delimited list of counties.'
        },

        alert: {
            type: 'string',
            required: true,
            description: 'Title of the alert'
        },

        severity: {
            type: 'string',
            required: true,
            isIn: ['Extreme', 'Severe', 'Moderate', 'Minor'],
            description: `Severity of alert: One of the following in order from highest to lowest ['Extreme', 'Severe', 'Moderate', 'Minor']`
        },

        starts: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            defaultsTo: () => moment().toISOString(true),
            description: `moment() parsable string of when the alert starts. Recommended ISO string.`
        },

        expires: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            defaultsTo: () => moment().add(15, 'minutes').toISOString(true),
            description: `moment() parsable string of when the alert expires. Recommended ISO string.`
        },
        
        color: {
            type: 'string',
            regex: /(^#[0-9A-F]{6}$)|(^#[0-9A-F]{3}$)/i,
            description: 'Hex color representing this alert.',
            required: true
        },
        
        information: {
            type: 'string',
            required: true,
            description: 'Detailed information about this alert for the public.'
        }
    },


    fn: async function (inputs, exits) {
        sails.log.debug('Controller eas/send called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            await sails.helpers.eas.addAlert(moment().valueOf(), 'WWSU', inputs.counties, inputs.alert, inputs.severity, moment(inputs.starts).toISOString(true), moment(inputs.expires).toISOString(true), inputs.color, inputs.information);
            await sails.helpers.eas.postParse();
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
