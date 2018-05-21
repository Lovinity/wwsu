module.exports = {

    friendlyName: 'Load',

    description: 'Load events.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        Calendar.preLoadEvents();
        return exits.success();
    }


};
