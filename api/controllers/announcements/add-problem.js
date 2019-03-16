/* global sails, moment, Announcements */

module.exports = {

    friendlyName: 'Announcements / Add-problem',

    description: 'Report a problem with WWSU.',

    inputs: {
        information: {
            type: 'string',
            required: true,
            description: 'Information about the problem.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller announcements/add-problem called.');

        try {

            // Add the reported issue to the database
            await Announcements.create({type: `djcontrols`, level: `danger`, title: `Reported Problem`, announcement: inputs.information, starts: moment().toISOString(true), expires: moment({year : 3000}).toISOString(true)}).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }

};
