/* global sails, History, Songsliked, moment, Songs */

module.exports = {

    friendlyName: 'songs/like',

    description: 'Registers a like for the song ID. This in-turn bumps its priority in RadioDJ.',

    inputs: {
        trackID: {
            type: 'number',
            required: true,
            description: 'The ID of the track being liked.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller songs/like called.');

        try {
            // Get the hosts's IP address first
            var from_IP = sails.helpers.getIP(this.req);

            // First, get the track record from the database (and reject if it does not exist)
            var track = await Songs.findOne({ID: inputs.trackID});
            if (!track)
                return exits.error(new Error(`The track ID provided does not exist.`));

            var query = {IP: from_IP, ID: inputs.trackID};

            // If config specifies users can like tracks multiple times, add a date condition.
            if (sails.config.custom.songsliked.limit > 0)
                query.createdAt = {'>=': moment().subtract(sails.config.custom.songsliked.limit, 'days').toISOString(true)};

            // First, check if the client already liked the track recently. Error if it cannot be liked again at this time.
            var records = await Songsliked.count(query);
            if (records && records > 0)
                return exits.error(new Error(`This track cannot be liked at this time; the client has already liked this track recently.`));

            // Next, as a failsafe, check to see this track ID actually played recently. We will allow a 30-minute grace. Any tracks not played within the last 30 minutes cannot be liked.
            var canLike = false;
            var records = await History.find({createdAt: {'>=': moment().subtract(30, 'minutes').toISOString(true)}}).sort('createdAt DESC');
            if (records && records.length > 0)
            {
                records
                        .filter(song => song.trackID === inputs.trackID)
                        .map(song => canLike = true);
            }
            if (!canLike)
                return exits.error(new Error(`This track has not recently been played. It cannot be liked at this time.`));

            // At this point, the track can be liked, so like it
            await Songsliked.create({IP: from_IP, trackID: inputs.trackID});

            // Update track weight if applicable / configured to change weight on a track like
            if (sails.config.custom.songsliked.priorityBump !== 0)
                await Songs.update({ID: inputs.trackID}, {weight: track.weight + sails.config.custom.songsliked.priorityBump});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};
