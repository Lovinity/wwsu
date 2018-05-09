var needle = require('needle');
var parser = require('xml2json');

module.exports = {

    friendlyName: 'rest / getQueue',

    description: 'Get the current RadioDJ queue. Also, update it in the Meta.automation variable for local access.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        needle('get', Meta['A'].radiodj + '/p?auth=' + sails.config.custom.restAuth)
                .then(async function (resp) {
                    try {
                        var queue = parser.toJson(resp.body);
                        if (queue === null)
                        {
                            Meta.automation = [];
                            return exits.success([]);
                        }
                        // If there's nothing in the queue, it returns NOT Array. If there is something in queue, it returns Array. Convert to Array if not array to be consistent.
                        if (Array.isArray(queue.ArrayOfSongData.SongData))
                        {
                            var thequeue = queue.ArrayOfSongData.SongData;
                            Meta.automation = _.map(queue.ArrayOfSongData.SongData, _.clone);
                        } else {
                            var thequeue = [];
                            Meta.automation = [];
                            thequeue.push(queue.ArrayOfSongData.SongData);
                            Meta.automation.push(queue.ArrayOfSongData.SongData);
                        }
                        return exits.success(thequeue);
                    } catch (e) {
                        return exits.error(e);
                    }
                })
                .catch(function (err) {
                    return exits.error(err);
                });
    }


};

