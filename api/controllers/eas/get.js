/* global Eas, sails */

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
                });
        if (this.req.isSocket)
            sails.sockets.join(this.req, 'eas');
        return exits.success(records);
    }


};
