/* global Songs, History, sails, Logs, moment */

require("moment-duration-format");

module.exports = {

    friendlyName: 'songs.getSpins',

    description: 'Get the spin counts of the provided track ID for the last 7 days, 30 days, year to date, and 365 days.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The song ID.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper songs.getSpins called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            var song = await Songs.findOne({ID: inputs.ID})
                    .catch((err) => {
                        return exits.error(err);
                    });
            sails.log.silly(`Song: ${song}`);

            // Get history from RadioDJ
            var history = History.find({artist: song.artist, title: song.title})
                    .catch((err) => {
                        return exits.success({});
                    });
            sails.log.verbose(`Retrieved history records: ${history.length}`);
            sails.log.silly(history);
            
            // Get history from manually logged track airs via DJs (EXPERIMENTAL: may need to revise to be more accurate, say, for mixed cases etc)
            var history2 = Logs.find({event: {'conains': 'DJ/Producer'}, trackArtist: song.artist, trackTitle: song.title})
                    .catch((err) => {
                        return exits.success({});
                    });
            sails.log.verbose(`Retrieved logs records: ${history2.length}`);
            sails.log.silly(history2);

            if (!history || !history2)
            {
                return exits.success({});
            } else {
                // Go through all the histories and count spins for last week, month, year to date, and year. Determine also the last time the track played.
                var lastplayed = moment('2002-01-01 00:00:01');
                var spins7 = 0;
                var spins30 = 0;
                var spinsYTD = 0;
                var spins365 = 0;
                await sails.helpers.asyncForEach(history, function (record, index) {
                    return new Promise(async (resolve2, reject2) => {
                        if (moment(record.date_played).isAfter(lastplayed))
                            lastplayed = moment(record.date_played);
                        if (moment(record.date_played).isAfter(moment().subtract(1, 'weeks')))
                            spins7 += 1;
                        if (moment(record.date_played).isAfter(moment().subtract(1, 'months')))
                            spins30 += 1;
                        if (moment(record.date_played).isAfter(moment().subtract(1, 'years')))
                            spins365 += 1;
                        if (moment(record.date_played).isAfter(moment().startOf('year')))
                            spinsYTD += 1;
                        return resolve2(false);
                    });
                });
                await sails.helpers.asyncForEach(history2, function (record, index) {
                    return new Promise(async (resolve2, reject2) => {
                        if (moment(record.createdAt).isAfter(lastplayed))
                            lastplayed = moment(record.date_played);
                        if (moment(record.createdAt).isAfter(moment().subtract(1, 'weeks')))
                            spins7 += 1;
                        if (moment(record.createdAt).isAfter(moment().subtract(1, 'months')))
                            spins30 += 1;
                        if (moment(record.createdAt).isAfter(moment().subtract(1, 'years')))
                            spins365 += 1;
                        if (moment(record.createdAt).isAfter(moment().startOf('year')))
                            spinsYTD += 1;
                        return resolve2(false);
                    });
                });

                return exits.success({7: spins7, 30: spins30, 'YTD': spinsYTD, 365: spins365});
            }

        } catch (e) {
            return exits.error(e);
        }
    }


};

