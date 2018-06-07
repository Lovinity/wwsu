/* global sails, Tasks */

module.exports = {

    friendlyName: 'Tasks / get',

    description: 'Get OpenProject tasks.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller tasks/get called.');
        try {
            var records = await Tasks.find({})
                    .tolerate((err) => {
                        exits.error(err);
                    });
            sails.log.verbose(`Tasks records retrieved: ${records.length}`);
            sails.log.silly(records);
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'tasks');
                sails.log.verbose('Tasks was a socket. Joining tasks.');
            }
            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};