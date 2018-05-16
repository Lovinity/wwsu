module.exports = {

    friendlyName: 'Directors / GetAll',

    description: 'Get all the WWSU directors and their current presence. If request is a socket, subscribe socket to receive changes to director presence.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var records = await Directors.find()
                .intercept((err) => {
                    sails.log.error(err);
                    return exits.error();
                });
        if (!records)
        {
            return exits.success([]);
        } else {
            return exits.success(records);
        }
    }


};
