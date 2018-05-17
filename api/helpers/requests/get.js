/* global Requests, sails, Songs */

module.exports = {

    friendlyName: 'requests / get',

    description: 'Get all pending requests.',

    inputs: {
        offset: {
            type: 'number',
            defaultsTo: 0,
            description: 'Start searching from this ID number.'
        }
    },

    fn: async function (inputs, exits) {
        var records = await Requests.find({played: 0, ID: {'>': inputs.offset}})
                .intercept((err) => {
                    return exits.error(err);
                });
        var thereturn = [];
        if (typeof records === 'undefined' || records.length === 0)
        {
            return exits.success([]);
        } else {
            var thereturn = [];
            await sails.helpers.asyncForEach(records, function (record) {
                return new Promise(async (resolve2, reject2) => {
                    var temp = record;
                    var record2 = await Songs.findOne({ID: record.songID})
                            .intercept((err) => {
                                return reject2(err);
                            });
                    if (record2)
                    {
                        temp.trackname = `${record2.artist} - ${record2.title}`;
                        thereturn.push(temp);
                    }
                    return resolve2(false);
                });
            });
            return exits.success(thereturn);
        }
    }


};

