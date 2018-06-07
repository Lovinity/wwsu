/* global sails */

module.exports = {

    friendlyName: 'logs / view',

    description: 'Display an HTML webpage to view system logs.',

    inputs: {

    },

    exits: {
        success: {
            responseType: 'view',
            viewTemplatePath: 'logs/home'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug(`Controller logs/view called.`);
        return exits.success();

    }


};
