/* global sails, Meta, moment, Xp, Listeners, Calendar */

module.exports = {

    friendlyName: 'xp.addPrerecord',

    description: 'Calculate and add XP for prerecorded shows.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug(`Helper xp.addPrerecord called!`);

        try {
            // Calculate XP if exiting prerecord
            if (Meta['A'].state === 'live_prerecord')
            {
                // Award XP based on time on the air
                var showTime = moment().diff(moment(Meta['A'].showStamp), 'minutes');
                var showXP = Math.round(showTime / sails.config.custom.XP.prerecordShowMinutes);

                await Xp.create({dj: Meta['A'].dj, type: 'xp', subtype: 'showtime', amount: showXP, description: `Prerecord was on the air for ${showTime} minutes.`})
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });

                // Calculate number of listener minutes for the show, and award XP based on configured values.
                var listenerMinutes = 0;
                var listeners = await Listeners.find({dj: Meta['A'].dj, createdAt: {'>=': moment(Meta['A'].showStamp).toISOString(true)}}).sort("createdAt ASC")
                        .tolerate((err) => {
                            // Do not throw for error, but log it
                            sails.log.error(err);
                        });

                if (listeners && listeners.length > 0)
                {
                    var prevTime = moment(Meta['A'].showStamp);
                    var prevListeners = 0;
                    var listenerMinutes = 0;
                    listeners.map(listener => {
                        listenerMinutes += (moment(listener.createdAt).diff(moment(prevTime), 'seconds') / 60) * prevListeners;
                        prevListeners = listener.listeners;
                        prevTime = moment(listener.createdAt);
                    });

                    // This is to ensure listener minutes from the most recent entry up until the current time is also accounted for
                    listenerMinutes += (moment().diff(moment(prevTime), 'seconds') / 60) * prevListeners;

                    listenerMinutes = Math.round(listenerMinutes);
                    var listenerXP = Math.round(listenerMinutes / sails.config.custom.XP.prerecordListenerMinutes);

                    await Xp.create({dj: Meta['A'].dj, type: 'xp', subtype: 'listeners', amount: listenerXP, description: `There were ${listenerMinutes} online listener minutes during the prerecord.`})
                            .tolerate((err) => {
                                // Do not throw for error, but log it
                                sails.log.error(err);
                            });
                }
            }

            return exits.success();
        } catch (e) {
            // Do not error for errors
            sails.log.error(e);
            return exits.success();
        }

    }


};

