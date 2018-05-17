/* global Requests, sails, Songs, Subcategory, Category, Settings */

var moment = require("moment");
require("moment-duration-format");

module.exports = {

    friendlyName: 'requests / checkRequestable',

    description: 'Check to see if a track can be requested by the client.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID number of the Song to check for request ability.'
        },
        IP: {
            type: 'string',
            required: true,
            description: 'The IP address of the client to check for request limits.'
        }
    },

    fn: async function (inputs, exits) {
        var d = moment().startOf('day');
        // First, check to see if the client has already exceeded their requests for the day
        var requests = await Requests.find({userIP: inputs.IP, requested: {'>=': d}})
                .intercept((err) => {
                    return exits.error(err);
                });
        if (requests.length >= sails.config.custom.requests.dailyLimit)
        {
            return exits.success({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                You have reached your daily request limit (${sails.config.custom.requests.dailyLimit}). Please check back tomorrow.
                                </div>`, type: 'requestRules'});
        }

        // Next, confirm the track ID actually exists
        var record = await Songs.findOne({ID: inputs.ID})
                .intercept((err) => {
                    return exits.error(err);
                });
        if (typeof record === 'undefined')
        {
            return exits.success({requestable: false, HTML: `<div class="alert alert-danger" role="alert">
                                Internal Error: Unable to find the requested track ID.
                                </div>`, type: 'internal'});
        }

        // Is the track disabled?
        if (record.enabled === 0)
        {
            return exits.success({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                            You cannot request a disabled track.
                                            </div>`, type: 'disabled'});
        }

        // Next, check if the provided track has already been requested and is pending to air
        var requests2 = await Requests.find({songID: inputs.ID, played: 0})
                .intercept((err) => {
                    return exits.error(err);
                });
        if (requests2.length > 0)
        {
            return exits.success({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                This track is already in the request queue and pending to air.
                                </div>`, type: 'inQueue'});
        }

        // Check if the track exists in 
        var subcat = await Subcategory.findOne({id: record.id_subcat})
                .intercept((err) => {
                    return exits.error(err);
                });
        if (typeof subcat === 'undefined')
            return exits.error(new Error('Unable to determine the track subcategory.'));
        var parentcat = await Category.findOne({id: subcat.parentid})
                .intercept((err) => {
                    return exits.error(err);
                });
        if (typeof parentcat === 'undefined')
            return exits.error(new Error('Unable to determine the track main category.'));
        if (sails.config.custom.requests.musicCats.indexOf(parentcat.ID) === -1)
        {
            return exits.success({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
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
                    return exits.error(err);
                });
        var rotationRules = {};
        thesettings.forEach(function (thesetting) {
            rotationRules[thesetting.setting] = thesetting.value;
        });

        // Check if we are past the end date of the track
        if (moment(record.end_date).isBefore() && moment(record.end_date).isAfter('2002-01-01 00:00:01'))
        {
            return exits.success({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                            You cannot request an expired track.
                                            </div>`, type: 'expired'});
        }

        // Check if we have not yet reached the start date of the track
        if (moment(record.start_date).isAfter())
        {
            return exits.success({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
                                            You cannot request a track that has not yet started airing.
                                            </div>`, type: 'expired'});
        }

        // Check if the track has exceeded the number of allowed spin counts
        if (record.limit_action > 0 && record.count_played >= record.play_limit)
        {
            return exits.success({requestable: false, HTML: `<div class="alert alert-warning" role="alert">
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
            return exits.success({requestable: false, HTML: `<div class="alert alert-warning" role="alert">This track fails one or more playlist rotation rules and cannot be requested at this time:${rulesFailed}</div>`, type: 'rotationRules'});

            // By this point, all rules passed and the track can be requested. Include the request form.
        } else {
            return exits.success({requestable: true, HTML: `<form action="javascript:requestTrack(${record.ID})"><div class="form-group">
                                    <label for="request-name"><strong>Request this track</strong></label>
                                    <input type="text" class="form-control" id="request-name" placeholder="Your name">
                                    <textarea class="form-control" id="request-message" rows="2" placeholder="An optional message to be included with your request."></textarea>
                                    </div>                    
                                    <button type="submit" class="btn btn-primary">Place Request</button>
                                    </form>`, type: 'requestable'});
        }

    }


};

