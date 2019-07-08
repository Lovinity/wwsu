module.exports = {

    friendlyName: 'EAS / Get',

    description: 'Get the currently active EAS alerts.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller eas/get called.');

        try {
            // Get records
            var records = await Eas.find();
            sails.log.verbose(`Retrieved Eas records: ${records.length}`);
            sails.log.silly(records);

            // Subscribe to sockets, if applicable
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'eas');
                sails.log.verbose('Request was a socket. Joining eas.');
            }

            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};
