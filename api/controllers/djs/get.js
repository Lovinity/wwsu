/* global sails, Xp, Djs, Attendance, moment */
// TODO: Update doc

module.exports = {

    friendlyName: 'djs / get',

    description: 'Retrieve a list of DJs in the system, or get information about a single DJ.',

    inputs: {
        dj: {
            type: 'number',
            description: `If provided, instead of returning an array of DJs, will return information about the specified DJ.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller djs/get called.');

        try {
            
            if (!inputs.dj)
            {
            // Grab DJs
            var records = await Djs.find();
            
            // Remove login information from the records
            records = records.map(record => {
                delete record.login;
                return record;
            });

            sails.log.verbose(`DJ records retrieved: ${records.length}`);

            // Subscribe to sockets if applicable
            if (this.req.isSocket)
            {
                sails.sockets.join(this.req, 'djs');
                sails.log.verbose('Request was a socket. Joining djs.');
            }

            // Return records
            if (!records || records.length < 1)
            {
                return exits.success([]);
            } else {
                return exits.success(records);
            }
            
            } else {
                
                var record = await Djs.findOne({ID: inputs.dj});
                var returnData = {startOfSemester: moment(sails.config.custom.startOfSemester).toISOString(true)};
                
                if (!record || record === null)
                    return exits.success({});
                
                returnData.XP = await Xp.find({dj: inputs.dj});
                returnData.attendance = await Attendance.find({dj: inputs.dj});
                returnData.stats = await sails.helpers.analytics.showtime(inputs.dj);
                
            }

        } catch (e) {
            return exits.error(e);
        }

    }


};
