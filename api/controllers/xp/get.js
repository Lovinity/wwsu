/* global sails, Logs, Xp, Calendar */

module.exports = {

    friendlyName: 'xp / get',

    description: 'Get the XP earned by a specific DJ.',

    inputs: {
        dj: {
            type: 'string',
            required: true,
            description: 'The DJ which to view XP information.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller xp/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        var resp = {XP: {totalXP: 0, remote: 0, rows: []}, attendance: []};

        try {
            resp.attendance = await Calendar.find({status: {"!=": -1}, or: [{title: {"startsWith": `Show: ${inputs.dj}`}}, {title: {"startsWith": `Prerecord: ${inputs.dj}`}}]}).sort('start DESC');
            
            var records = await Xp.getDatastore().sendNativeQuery(`SELECT * FROM xp WHERE dj LIKE $1 ORDER BY FIELD(type,"remote") DESC, createdAt DESC`, [inputs.dj]);
            records = records.rows;

            if (records.length > 0)
            {
                records.forEach(function (record) {
                    resp.XP.rows.push(record);
                    
                    if (typeof resp.XP[record.subtype] === 'undefined')
                        resp.XP[record.subtype] = 0;

                    resp.XP[record.subtype] += record.amount;
                    if (record.type !== 'remote')
                    {
                        resp.XP.totalXP += record.amount;
                    } else {
                        resp.XP.totalXP += (sails.config.custom.XP.remoteCredit * record.amount);
                        resp.XP.remote += record.amount;
                    }
                });
            }

            return exits.success(resp);
        } catch (e) {
            return exits.error(e);
        }

    }


};
