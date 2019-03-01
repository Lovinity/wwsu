/* global Discipline, sails */

module.exports = {

    friendlyName: 'Discipline / Get',

    description: 'Get an array of discipline in the system.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug("controller discipline/get called.");

        try {
            var records = await Discipline.find();
            // Subscribe to sockets if applicable
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'discipline');
                sails.log.verbose('Request was a socket. Joining discipline.');
            }

            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};
