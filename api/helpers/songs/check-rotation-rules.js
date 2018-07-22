/* global Songs, Settings, sails, moment */

require("moment-duration-format");

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
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Find the track
            var record = await Songs.findOne({ID: inputs.ID});
            sails.log.silly(`Song: ${record}`);

            // Get rotation rule settings as saved in the database by RadioDJ.
            var thesettings = await Settings.find({source: 'settings_general', setting: ['RepeatTrackInterval', 'RepeatArtistInteval', 'RepeatAlbumInteval', 'RepeatTitleInteval']});
            sails.log.silly(`Rotation settings: ${thesettings}`);
            var rotationRules = {};
            thesettings.forEach(function (thesetting) {
                rotationRules[thesetting.setting] = thesetting.value;
            });

            // Check if we are past the end date of the track
            if (moment(record.end_date).isBefore() && moment(record.end_date).isAfter('2002-01-01 00:00:01'))
                return exits.success(false);

            // Check if we have not yet reached the start date of the track
            if (moment(record.start_date).isAfter())
                return exits.success(false);

            // Check if the track has exceeded the number of allowed spin counts
            if (record.limit_action > 0 && record.count_played >= record.play_limit)
                return exits.success(false);

            // Check rotation rules
            if (moment(record.date_played).isAfter(moment().subtract(rotationRules.RepeatTrackInterval, 'minutes')))
                return exits.success(false);
            if (moment(record.title_played).isAfter(moment().subtract(rotationRules.RepeatTitleInteval, 'minutes')))
                return exits.success(false);
            if (moment(record.artist_played).isAfter(moment().subtract(rotationRules.RepeatArtistInteval, 'minutes')))
                return exits.success(false);
            if (moment(record.album_played).isAfter(moment().subtract(rotationRules.RepeatAlbumInteval, 'minutes')))
                return exits.success(false);

            return exits.success(true);
        } catch (e) {
            return exits.error(e);
        }
    }


};

