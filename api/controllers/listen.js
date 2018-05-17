// WORK ON THIS
module.exports = {

    friendlyName: 'Listen',

    description: 'Load the listener corner.',

    inputs: {

    },

    exits: {
        success: {
            responseType: 'view',
            viewTemplatePath: 'listen/home'
        }
    },

    fn: async function (inputs, exits) {

        return exits.success();

    }


};
