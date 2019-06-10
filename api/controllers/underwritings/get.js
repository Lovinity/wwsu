/* global sails */

module.exports = {

    friendlyName: 'Underwritings / Get',

    description: 'Get all of the underwritings currently in the system, and subscribe to the underwritings socket.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller underwritings/get called.');
        try {
            // Get underwritings records
            var records = await Underwritings.find();
            sails.log.verbose(`Underwritings records retrieved: ${records.length}.`);
            sails.log.silly(records);
            
            // Subscribe to websocket if applicable
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'underwritings');
                sails.log.verbose('Request was a socket. Joining underwritings.');
            }
            
            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};