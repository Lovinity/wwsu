module.exports = {

    friendlyName: 'Planner / get',

    description: 'Get the shows saved in the show planner.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller planner/get called.');
        try {
            // Get items in the schedule planner
            var records = await Planner.find();
            sails.log.verbose(`planner records retrieved: ${records.length}`);

            // Subscribe to web socket if applicable
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'planner');
                sails.log.verbose('Request was a socket. Joining planner.');
            }

            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
    }


};



