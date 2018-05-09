/**
 * Requests.js
 *
 * @description :: Track requests for RadioDJ.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

// WORK ON THIS
module.exports = {
    datastore: 'radiodj',

    attributes: {

        ID: {
            type: 'number',
            autoIncrement: true,
        },

        songID: {
            type: 'number'
        },

        username: {
            type: 'string'
        },

        userIP: {
            type: 'string',
            maxLength: 50
        },

        message: {
            type: 'string'
        },

        requested: {
            type: 'ref',
            columnType: 'datetime'
        },

        played: {
            type: 'number',
            min: 0,
            max: 2
        }

    },
    
    pending: [], // Store track ID numbers in memory so that we don't need to query the Requests table every second and see if a request is being played.

    /**
     * Get a formatted array of requests pending in the queue.
     */

    getRequests: function (offset = 0) {
        return new Promise(async (resolve, reject) => {
            var records = await Requests.find({played: 0, ID: {'>': offset}})
                    .intercept((err) => {
                        return reject(err);
                    });
            var thereturn = [];
            if (typeof records == 'undefined' || records.length == 0)
            {
                return resolve([]);
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
                        return resolve2();
                    });
                });
                return resolve(thereturn);
            }
        });
    },

    /**
     * Check if a track can be requested by a specific client.
     * @constructor
     * @param {number} ID - ID of the song/track to request
     * @param {string} IP - IP address of the client
     */

    checkRequestable: function (ID, IP) {
        return new Promise(async (resolve, reject) => {
            if (typeof ID == 'undefined' || typeof IP == 'undefined')
                return reject(new Error('Required parameters: ID, IP.'));
            var canrequest = true;
            var moment = require("moment");
            var d = moment().startOf('day');
            require("moment-duration-format");

            // First, check to see if the client has already exceeded their requests for the day
            var requests = await Requests.find({userIP: IP, requested: {'>=': d}})
                    .intercept((err) => {
                        return reject(err);
                    });
            if (requests.length >= sails.config.custom.requests.dailyLimit)
            {
                return resolve({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                You have reached your daily request limit (${sails.config.custom.requests.dailyLimit}). Please check back tomorrow.
                                </div>`, type: 'requestRules'});
            }

            // Next, confirm the track ID actually exists
            var record = await Songs.findOne({ID: ID})
                    .intercept((err) => {
                        return reject(err);
                    });
            if (typeof record == 'undefined')
            {
                return resolve({requestable: false, HTML: `<div class="alert alert-danger" role="alert">
                                Internal Error: Unable to find the requested track ID.
                                </div>`, type: 'internal'});
            }

            // Is the track disabled?
            if (record.enabled == 0)
            {
                return resolve({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                            You cannot request a disabled track.
                                            </div>`, type: 'disabled'});
            }

            // Next, check if the provided track has already been requested and is pending to air
            var requests2 = await Requests.find({songID: ID, played: 0})
                    .intercept((err) => {
                        return reject(err);
                    });
            if (requests2.length > 0)
            {
                return resolve({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                This track is already in the request queue and pending to air.
                                </div>`, type: 'inQueue'});
            }

            // Check if the track exists in 
            var subcat = await Subcategory.findOne({id: record.id_subcat})
                    .intercept((err) => {
                        return reject(err);
                    });
            if (typeof subcat == 'undefined')
                return reject(new Error('Unable to determine the track subcategory.'));
            var parentcat = await Category.findOne({id: subcat.parentid})
                    .intercept((err) => {
                        return reject(err);
                    });
            if (typeof parentcat == 'undefined')
                return reject(new Error('Unable to determine the track main category.'));
            if (sails.config.custom.requests.musicCats.indexOf(parentcat.ID) == -1)
            {
                return resolve({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                            You cannot request a non-music track.
                                            </div>`, type: 'nonMusic'});
            }

            // DEPRECATED: System should be designed not to mark requests as played until they actually play in RadioDJ.
            /*
             var inQueue = false;
             Statemeta.automation.forEach(function (thetrack) {
             if (thetrack.Artist == record.artist && thetrack.Title == record.title)
             {
             inQueue = true;
             }
             });
             if (inQueue)
             {
             cb(false, `<div class="alert alert-warning" role="alert">
             This track is already in the automation queue and pending to air.
             </div>`, 'inQueue');
             return null;
             }
             */

            // The rest of the checks are based off of track rotation rule settings saved in the database via RadioDJ
            var thesettings = await Settings.find({source: 'settings_general', setting: ['RepeatTrackInterval', 'RepeatArtistInteval', 'RepeatAlbumInteval', 'RepeatTitleInteval']})
                    .intercept((err) => {
                        return reject(err);
                    });
            var rotationRules = {};
            thesettings.forEach(function (thesetting) {
                rotationRules[thesetting.setting] = thesetting.value;
            });

            // Check if we are past the end date of the track
            if (moment(record.end_date).isBefore() && moment(record.end_date).isAfter('2002-01-01 00:00:01'))
            {
                return resolve({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                            You cannot request an expired track.
                                            </div>`, type: 'expired'});
            }

            // Check if we have not yet reached the start date of the track
            if (moment(record.start_date).isAfter())
            {
                return resolve({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                            You cannot request a track that has not yet started airing.
                                            </div>`, type: 'expired'});
            }

            // Check if the track has exceeded the number of allowed spin counts
            if (record.limit_action > 0 && record.count_played >= record.play_limit)
            {
                return resolve({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                            You cannot request an expired track.
                                            </div>`, type: 'expired'});
            }

            // Check rotation rules
            var passesRules = true;
            var rulesFailed = ``;
            if (moment(record.date_played).isAfter(moment().subtract(rotationRules.RepeatTrackInterval, 'minutes'))) {
                passesRules = false;
                rulesFailed += `<br>*The same track played recently. Wait about ${moment().to(moment(record.date_played).add(rotationRules.RepeatTrackInterval, 'minutes'), true)}`;
            }
            if (moment(record.title_played).isAfter(moment().subtract(rotationRules.RepeatTitleInteval, 'minutes'))) {
                passesRules = false;
                rulesFailed += `<br>*A track with same title played recently. Wait about ${moment().to(moment(record.title_played).add(rotationRules.RepeatTitleInteval, 'minutes'), true)}`;
            }
            if (moment(record.artist_played).isAfter(moment().subtract(rotationRules.RepeatArtistInteval, 'minutes'))) {
                passesRules = false;
                rulesFailed += `<br>*A track from the same artist played recently. Wait about ${moment().to(moment(record.artist_played).add(rotationRules.RepeatArtistInteval, 'minutes'), true)}`;
            }
            if (moment(record.album_played).isAfter(moment().subtract(rotationRules.RepeatAlbumInteval, 'minutes'))) {
                passesRules = false;
                rulesFailed += `<br>*A track from the same album played recently. Wait about ${moment().to(moment(record.album_played).add(rotationRules.RepeatAlbumInteval, 'minutes'), true)}`;
            }
            if (!passesRules)
            {
                return resolve({requestable: false, HTML: `<div class="alert alert-warning" role="alert">This track fails one or more playlist rotation rules and cannot be requested at this time:${rulesFailed}</div>`, type: 'rotationRules'});

                // By this point, all rules passed and the track can be requested. Include the request form.
            } else {
                return resolve({requestable: true, HTML: `<form action="javascript:requestTrack(${record.ID})"><div class="form-group">
                                    <label for="request-name"><strong>Request this track</strong></label>
                                    <input type="text" class="form-control" id="request-name" placeholder="Your name">
                                    <textarea class="form-control" id="request-message" rows="2" placeholder="An optional message to be included with your request."></textarea>
                                    </div>                    
                                    <button type="submit" class="btn btn-primary">Place Request</button>
                                    </form>`, type: 'requestable'});
            }
        });
    },

    /**
     * Add a request to the system
     * @constructor
     * @param {number} ID - ID of the song/track to request
     * @param {string} IP - IP address of the client
     * @param {string} name - Name of the person making the request
     * @param {string} message - A message regarding the request
     */
    place: function (ID, IP = '0.0.0.0', name = 'anonymous', message = '') {
        return new Promise(async (resolve, reject) => {
            var moment = require("moment");
            if (typeof ID == 'undefined')
            {
                return reject(new Error('Required parameter: ID'));
            }
            try {
                // First, confirm the track can actually be requested.
                var requestable = await Requests.checkRequestable(ID, IP);

                // If so, do stuff
                if (requestable.requestable)
                {
                    // Get the song data
                    var record2 = await Songs.findOne({ID: ID})
                            .intercept((err) => {
                                return reject(err);
                            });
                    // Create the request
                    var record = await Requests.create({songID: ID, username: name, userIP: IP, message: message, requested: moment().toISOString(), played: 0})
                            .intercept((err) => {
                                return reject(err);
                            });
                    Requests.pending.push(ID);
                    // Push the request through websockets
                    var temp = record;
                    if (record2)
                        temp.trackname = `${record2.artist} - ${record2.title}`;
                    sails.sockets.broadcast('message-request', 'message-request', [temp]);
                    // Update the Track Requests recipient to light up, showing a pending request is in queue.
                    var temp2 = {};
                    temp2['system'] = {};
                    temp2['system']['trackrequests'] = {label: 'Track Requests', status: 4};
                    sails.sockets.broadcast('message-user', 'message-user', temp2);
                    // Finish it
                    return resolve({requested: true, HTML: `<div class="alert alert-success" role="alert">
                                            Request placed! In automation, requests are queued every :20, :40, and :00 past the hour. If a show is live, it is up to the host's discretion of when/if to play requests.
                                            </div>`});
                    // If it cannot be requested, respond with the errors of why it cannot be requested.
                } else {
                    return resolve({requested: false, HTML: requestable.HTML});
                }
            } catch (e) {
                return reject(e);
            }
        });

    }

};

