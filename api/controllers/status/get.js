module.exports = {

    friendlyName: 'Status / Get',

    description: 'Get the current status of all subsystems. If socket request, subscribe to receiving status changes.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var records = await Status.find()
                .intercept((err) => {
                    sails.log.error(err);
                    return exits.error();
                });
        return exits.success(records);
    }


};
