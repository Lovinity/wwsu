/* global sails, Announcements */

module.exports = {

    friendlyName: 'Announcements / Remove',

    description: 'Remove an announcement.',

    inputs: {
        ID: {
            type: 'number',
            required: true
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller announcements/remove called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            await Announcements.destroy({ID: inputs.ID}).fetch();
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};
