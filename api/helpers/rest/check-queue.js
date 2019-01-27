/* global sails, Meta, _, needle, Status, Songs */

module.exports = {

    friendlyName: 'rest.checkQueue',

    description: 'This helper will resolve the provided exits parameter when sails.helpers.rest.getQueue confirms the provided track ID is in the RadioDJ queue.',

    inputs: {

        ID: {
            type: 'number',
            required: true,
            description: 'the track ID to monitor for in RadioDJ'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper rest.checkQueue called.');
        Songs.queueCheck.push({ID: inputs.ID, time: moment(), success: exits.success, error: exits.error});
    }

};

