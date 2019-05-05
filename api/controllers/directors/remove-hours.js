/* global Calendar, sails, Directorhours */

module.exports = {

    friendlyName: 'Directors / remove-hours',

    description: 'Remove an event for the director hours calendar; should only be used to remove cancellations.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the calendar event to remove.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller directors/remove-hours called.');
        try {
            // Grab events
            await Directorhours.destroy({ID: inputs.ID}).fetch();
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};

