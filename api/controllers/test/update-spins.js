module.exports = {

    friendlyName: 'Update spins',

    description: '',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        try {
            /*
            var year = {};
            var ytd = {};
            var month = {};
            var week = {};
            // get radioDJ history records from the past year
            var history = await History.find({date_played: {'>=': moment().subtract(1, 'years').toISOString(true)}});
            if (history.length > 0)
            {
                history.forEach(function (record) {
                    if (typeof year[`${record.artist} - ${record.title}`] === 'undefined')
                        year[`${record.artist} - ${record.title}`] = 0;
                    if (typeof ytd[`${record.artist} - ${record.title}`] === 'undefined')
                        ytd[`${record.artist} - ${record.title}`] = 0;
                    if (typeof month[`${record.artist} - ${record.title}`] === 'undefined')
                        month[`${record.artist} - ${record.title}`] = 0;
                    if (typeof week[`${record.artist} - ${record.title}`] === 'undefined')
                        week[`${record.artist} - ${record.title}`] = 0;
                    year[`${record.artist} - ${record.title}`]++;
                    if (moment(record.date_played).isSameOrAfter(moment().startOf('year')))
                        ytd[`${record.artist} - ${record.title}`]++;
                    if (moment(record.date_played).isSameOrAfter(moment().subtract(30, 'days')))
                        month[`${record.artist} - ${record.title}`]++;
                    if (moment(record.date_played).isSameOrAfter(moment().subtract(7, 'days')))
                        week[`${record.artist} - ${record.title}`]++;
                });
            }
            // Get history from manually logged track airs via DJs from the past year
            var history2 = await Logs.find({event: {'contains': 'DJ/Producer'}, createdAt: {'>=': moment().subtract(1, 'years').toISOString(true)}});
            if (history2.length > 0)
            {
                history2.forEach(function (record) {
                    if (typeof year[`${record.trackArtist} - ${record.trackTitle}`] === 'undefined')
                        year[`${record.trackArtist} - ${record.trackTitle}`] = 0;
                    if (typeof ytd[`${record.trackArtist} - ${record.trackTitle}`] === 'undefined')
                        ytd[`${record.trackArtist} - ${record.trackTitle}`] = 0;
                    if (typeof month[`${record.trackArtist} - ${record.trackTitle}`] === 'undefined')
                        month[`${record.trackArtist} - ${record.trackTitle}`] = 0;
                    if (typeof week[`${record.trackArtist} - ${record.trackTitle}`] === 'undefined')
                        week[`${record.trackArtist} - ${record.trackTitle}`] = 0;
                    year[`${record.trackArtist} - ${record.trackTitle}`]++;
                    if (moment(record.createdAt).isSameOrAfter(moment().startOf('year')))
                        ytd[`${record.trackArtist} - ${record.trackTitle}`]++;
                    if (moment(record.createdAt).isSameOrAfter(moment().subtract(30, 'days')))
                        month[`${record.trackArtist} - ${record.trackTitle}`]++;
                    if (moment(record.createdAt).isSameOrAfter(moment().subtract(7, 'days')))
                        week[`${record.trackArtist} - ${record.trackTitle}`]++;
                });
            }
            // Get all song records
            var songs = await Songs.find({});
            if (songs.length > 0)
            {
                await sails.helpers.asyncForEach(songs, function (record) {
                    return new Promise(async (resolve2, reject2) => {
                        try {
                            await Songs.update({ID: record.ID}, {spins_7: week[`${record.artist} - ${record.title}`] || 0, spins_30: month[`${record.artist} - ${record.title}`] || 0, spins_ytd: ytd[`${record.artist} - ${record.title}`] || 0, spins_year: year[`${record.artist} - ${record.title}`] || 0});
                            return resolve2(false);
                        } catch (e) {
                            sails.log.error(e);
                            return resolve2(false);
                        }
                    });
                });
            }
            */
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
