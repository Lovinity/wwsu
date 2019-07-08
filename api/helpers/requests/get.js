module.exports = {

    friendlyName: 'requests.get',

    description: 'Get all pending requests.',

    inputs: {
        offset: {
            type: 'number',
            defaultsTo: 0,
            description: 'Start searching from this ID number.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper requests.get called.');

        try {
            // Get the requested tracks that have not yet played
            var records = await Requests.find({played: 0, ID: {'>': inputs.offset}});
            sails.log.verbose(`Requests records retrieved: ${records.length}`);

            var thereturn = [];

            // Return an empty array if there are no requested tracks that have not yet aired.
            if (typeof records === 'undefined' || records.length === 0)
            {
                return exits.success([]);
            } else {
                thereturn = [];

                // Get artist and title of each requested track
                var maps = records.map(async record => {
                    var temp = record;
                    var record2 = await Songs.findOne({ID: record.songID});
                    sails.log.silly(`Song: ${record2}`);
                    if (record2)
                    {
                        temp.trackname = `${record2.artist} - ${record2.title}`;
                        thereturn.push(temp);
                    }
                    return true;
                });
                await Promise.all(maps);
                return exits.success(thereturn);
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

