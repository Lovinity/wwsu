/* global sails, Meta, _, needle, Status, Songs, moment */

module.exports = {

    friendlyName: 'rest.getQueue',

    description: 'Get the current RadioDJ queue. Also, update it in the Meta.automation variable for local access.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper rest.getQueue called.');
        try {
            // Return queue in memory instead of checking for the current queue if we are waiting for a healthy RadioDJ to report
            if (Status.errorCheck.waitForGoodRadioDJ)
                return exits.success(Meta.automation);
            // Query for the radioDJ queue and update Meta.automation with the queue.
            needle('get', Meta['A'].radiodj + '/p?auth=' + sails.config.custom.rest.auth, {}, {open_timeout: 2000, response_timeout: 2000, read_timeout: 2000, headers: {'Content-Type': 'application/json'}})
                    .then(async function (resp) {
                        try {
                            if (typeof resp.body.name === 'undefined' || (resp.body.name !== 'ArrayOfSongData' && resp.body.name !== 'SongData'))
                            {
                                return exits.success([]);
                            }
                            if (resp.body.name === 'ArrayOfSongData')
                            {
                                Meta.automation = [];
                                resp.body.children.map(trackA => {
                                    var theTrack = {};
                                    trackA.children.map(track => theTrack[track.name] = track.value);
                                    Meta.automation.push(theTrack);
                                });
                            } else {
                                Meta.automation = [];
                                var theTrack = {};
                                resp.body.children.map(track => theTrack[track.name] = track.value);
                                Meta.automation.push(theTrack);
                            }
                            
                            // Run through Songs.queueCheck
                            var inQueue = [];
                            Meta.automation.map(track => inQueue.push(parseInt(track.ID)));
                            sails.log.verbose(JSON.stringify(inQueue));
                            Songs.queueCheck.map((check, index) => {
                                sails.log.verbose(`queueCheck ${check.ID}`);
                                if (inQueue.indexOf(check.ID) !== -1)
                                {
                                    sails.log.verbose(`IN QUEUE. Resolving success.`);
                                    check.success();
                                    delete Songs.queueCheck[index];
                                } else if (moment().diff(moment(check.time), 'seconds') >= 10)
                                {
                                    check.error(new Error(`Did not find track ${check.ID} in the queue after 10 seconds.`));
                                    delete Songs.queueCheck[index];
                                }
                            });
                            
                            return exits.success(Meta.automation);
                        } catch (e) {
                            throw e;
                        }
                    })
                    .catch(function (err) {
                        return exits.error(err);
                    });
        } catch (e) {
            sails.log.debug(`CAUGHT2`);
            return exits.error(e);
        }
    }


};

