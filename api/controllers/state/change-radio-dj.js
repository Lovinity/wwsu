/* global Meta, sails */

module.exports = {

    friendlyName: 'state/change-radio-dj',

    description: 'Switch which radioDJ is currently active.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller state/change-radio-dj called.');

        try {
            Meta.changingState = true;
            await sails.helpers.rest.cmd('EnableAssisted', 1, 0);
            await sails.helpers.rest.cmd('EnableAutoDJ', 1, 0);
            await sails.helpers.rest.cmd('StopPlayer', 0, 0);
            await sails.helpers.rest.changeRadioDj();
            await sails.helpers.error.post();
            Meta.changingState = false;
            return exits.success();
        } catch (e) {
            Meta.changingState = false;
            return exits.error(e);
        }

    }


};
