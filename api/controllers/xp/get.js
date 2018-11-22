/* global sails, Logs, Xp, Calendar, Attendance */

module.exports = {

    friendlyName: 'xp / get',

    description: 'Get the XP earned by a specific DJ.',

    inputs: {
        dj: {
            type: 'string',
            allowNull: true,
            description: 'The DJ which to view XP information.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller xp/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Get XP records
            if (inputs.dj && inputs.dj !== null && inputs.dj !== '')
            {
                var records = await Xp.find({dj: inputs.dj});

                return exits.success(records);
            } else {
                
                // Join xp socket if applicable
                if (this.req.isSocket)
                {
                    sails.sockets.join(this.req, 'xp');
                    sails.log.verbose('Request was a socket. Joining xp.');
                }

                return exits.success();
            }
        } catch (e) {
            return exits.error(e);
        }

    }


};
