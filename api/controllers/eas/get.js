/* global Eas, sails */

module.exports = {

    friendlyName: 'EAS / Get',

    description: 'Get the currently active EAS alerts.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller eas/get called.');
        var records = await Eas.find()
                .tolerate((err) => {
                    sails.log.error(err);
                    exits.error();
                });
                sails.log.verbose(`Retrieved Eas records: ${records.length}`);
                sails.log.silly(records);
        if (this.req.isSocket)
        {
            sails.sockets.join(this.req, 'eas');
            sails.log.verbose('Request was a socket. Joining eas.');
        }
        return exits.success(records);
    }


};
