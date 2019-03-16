/* global sails, Status, Meta, Logs, Songs, Promise, Announcements, moment */

module.exports = {

    friendlyName: 'silence / active',

    description: 'DJ Controls should call this endpoint every minute whenever silence is detected.',

    inputs: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller silence/active called.');

        try {
            // Activate status issue
            Status.changeStatus([{name: `silence`, status: 2, label: `Silence`, data: `Silence / very low audio detected.`}]);

            // If a track is playing in RadioDJ, skip it and log it
            if (typeof Meta.automation[0] !== 'undefined' && parseInt(Meta.automation[0].ID) !== 0)
            {
                // Add a log about the track
                await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'silence-track', loglevel: 'warning', logsubtype: Meta['A'].show, event: `Track skipped due to silence.<br />Track: ${Meta.automation[0].ID} (${Meta.automation[0].Artist} - ${Meta.automation[0].Title})`}).fetch()
                        .tolerate((err) => {
                        });

                // Skip the track if there's a track playing in automation
                if (typeof Meta.automation[1] !== 'undefined')
                {
                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                } else {
                    sails.helpers.rest.cmd('StopPlayer', 0);
                }
            }

            // If we are in automation, and prevError is less than 3 minutes ago, assume an audio issue and switch RadioDJs
            if (moment().isBefore(moment(Status.errorCheck.prevError).add(3, 'minutes')) && (Meta['A'].state.startsWith("automation_") || Meta['A'].state === 'live_prerecord'))
            {
                await Meta.changeMeta({changingState: `Switching automation instances due to no audio`});
                
                // Log the problem
                await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'system', loglevel: 'danger', logsubtype: '', event: `Switching automation instances; silence detection executed multiple times.`}).fetch()
                        .tolerate((err) => {
                            sails.log.error(err);
                        });
                await Announcements.findOrCreate({type: 'djcontrols', title: `Audio Error (system)`, announcement: "System recently had switched automation instances because the silence detection system triggered multiple times. Please check the logs for more info."}, {type: 'djcontrols', level: 'urgent', title: `Audio Error (system)`, announcement: "System recently had switched automation instances because the silence detection system triggered multiple times. Please check the logs for more info.", starts: moment().toISOString(true), expires: moment({year: 3000}).toISOString(true)})
                        .tolerate((err) => {
                            sails.log.error(err);
                        });

                // Find a RadioDJ to switch to
                var maps = sails.config.custom.radiodjs
                        .filter((instance) => instance.rest === Meta['A'].radiodj)
                        .map(async (instance) => {
                            var status = await Status.findOne({name: `radiodj-${instance.name}`});
                            if (status && status.status !== 1)
                                await Status.changeStatus([{name: `radiodj-${instance.name}`, label: `RadioDJ ${instance.label}`, status: 2, data: `Silence detection triggered multiple times. This RadioDJ might not be outputting audio.`}]);
                            return true;
                        });
                await Promise.all(maps);
                
                sails.sockets.broadcast('system-error', 'system-error', true);
                
                // Prepare the radioDJ
                await sails.helpers.rest.cmd('EnableAutoDJ', 0, 0);
                await sails.helpers.rest.cmd('EnableAssisted', 1, 0);
                await sails.helpers.rest.cmd('StopPlayer', 0, 0);
                var queue = Meta.automation;
                await sails.helpers.rest.changeRadioDj();
                await sails.helpers.rest.cmd('ClearPlaylist', 1);
                await sails.helpers.error.post(queue);
                await Meta.changeMeta({changingState: null});
            }

            Status.errorCheck.prevError = moment();
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
