/* global sails, Meta, _, needle */

module.exports = {

    friendlyName: 'rest.getQueue',

    description: 'Get the current RadioDJ queue. Also, update it in the Meta.automation variable for local access.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper rest.getQueue called.');
        needle('get', Meta['A'].radiodj + '/p?auth=' + sails.config.custom.rest.auth, {}, {open_timeout: 2000, response_timeout: 2000, read_timeout: 2000})
                .then(async function (resp) {
                    try {
                        Meta.automation = [];
                        if (typeof resp.body.name === 'undefined' || (resp.body.name !== 'ArrayOfSongData' && resp.body.name !== 'SongData'))
                        {
                            return exits.success([]);
                        }
                        if (resp.body.name === 'ArrayOfSongData')
                        {
                            resp.body.children.forEach(function (trackA, index) {
                                var theTrack = {};
                                trackA.children.forEach(function (track) {
                                    theTrack[track.name] = track.value;
                                });
                                Meta.automation.push(theTrack);
                            });
                        } else {
                            var theTrack = {};
                            resp.body.children.forEach(function (track) {
                                theTrack[track.name] = track.value;
                            });
                            Meta.automation.push(theTrack);
                        }
                        return exits.success(Meta.automation);
                    } catch (e) {
                        return exits.error(e);
                    }
                })
                .catch(function (err) {
                    return exits.error(err);
                });
    }


};

