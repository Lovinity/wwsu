module.exports = {

    friendlyName: 'EAS / Get',

    description: 'Get the currently active EAS alerts.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var records = await Eas.find()
                .intercept((err) => {
                    sails.log.error(err);
                    exits.error();
                })
        return exits.success(records);
    }


};
