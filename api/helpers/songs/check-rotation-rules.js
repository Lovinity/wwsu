require('moment-duration-format');

module.exports = {

    friendlyName: 'Songs.checkRotationRules',

    description: 'Returns true if this track is allowed to be played via rotation rules, false if it is not allowed to be played',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The song ID number to check.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper songs.checkRotationRules called.');

        try {
            // Find the track
            var record = await Songs.findOne({ID: inputs.ID});
            sails.log.silly(`Song: ${record}`);

            // Return false (fails rules) if the track does not exist
            if (!record)
                {return exits.success(false);}

            // Return false (fails rules) if the track is not enabled
            if (record.enabled !== 1)
                {return exits.success(false);}

            // Return false (fails rules) if the track has exceeded the play limit.
            if (record.limit_action > 0 && record.count_played >= record.play_limit)
                {return exits.success(false);}

            // Return false (fails rules) if the track's end date/time has passed.
            if (moment(record.end_date).isBefore() && moment(record.end_date).isAfter('2002-01-01 00:00:01'))
                {return exits.success(false);}

            // Return false (fails rules) if the current date/time is before the track's start date/time.
            if (moment(record.start_date).isAfter())
                {return exits.success(false);}

            // Get rotation rule settings as saved in the database by RadioDJ.
            var thesettings = await Settings.find({source: 'settings_general', setting: ['RepeatTrackInterval', 'RepeatArtistInteval', 'RepeatAlbumInteval', 'RepeatTitleInteval']});
            sails.log.silly(`Rotation settings: ${thesettings}`);
            var rotationRules = {};
            thesettings.map(thesetting => {rotationRules[thesetting.setting] = thesetting.value;});

            // Check rotation rules and return false (fail) if any rules are not satisfied.
            if (moment(record.date_played).isAfter(moment().subtract(rotationRules.RepeatTrackInterval, 'minutes')))
                {return exits.success(false);}
            if (moment(record.title_played).isAfter(moment().subtract(rotationRules.RepeatTitleInteval, 'minutes')))
                {return exits.success(false);}
            if (moment(record.artist_played).isAfter(moment().subtract(rotationRules.RepeatArtistInteval, 'minutes')))
                {return exits.success(false);}
            if (moment(record.album_played).isAfter(moment().subtract(rotationRules.RepeatAlbumInteval, 'minutes')))
                {return exits.success(false);}

            // By this point, the track passes all rules. Return true.
            return exits.success(true);
        } catch (e) {
            return exits.error(e);
        }
    }


};

