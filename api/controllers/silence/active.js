/* global sails, Status, Meta, Logs, Songs */

module.exports = {

    friendlyName: 'silence / active',

    description: 'Silence detection program should hit this endpoint when silence was detected.',

    inputs: {
        key: {
            type: 'string',
            required: true,
            custom: function (value) {
                return value === sails.config.custom.silence.key;
            },
            description: 'Secret key that the silence detection program must pass as a parameter.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller silence/active called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            // Activate status issue
            Status.changeStatus([{name: `silence`, status: 2, label: `Silence`, data: `Silence / very low audio was detected! Please check the OnAir audio levels.`}]);

            // Add a log entry
            await Logs.create({logtype: 'operation', loglevel: 'error', logsubtype: Meta['A'].dj, event: 'Silence / quiet audio detected for at least 15 seconds.'})
                    .tolerate((err) => {
                    });

            // If a track is playing in RadioDJ, disable it and skip it
            if (typeof Meta.automation[0] !== 'undefined' && parseInt(Meta.automation[0].ID) !== 0)
            {
                // Disable the track
                await Songs.update({ID: parseInt(Meta.automation[0].ID)}, {enabled: -1})
                        .tolerate((err) => {
                        });
                // Add another log about it
                await Logs.create({logtype: 'operation', loglevel: 'error', logsubtype: Meta['A'].dj, event: `Track ${Meta.automation[0].ID} (${Meta.automation[0].Artist} - ${Meta.automation[0].Title}) was skipped/disabled due to silence alarm. NOTE: status on the track was set to -1, which means the verify tracks tool in RadioDJ will re-enable it!`})
                        .tolerate((err) => {
                        });
                // Skip the track
                if (typeof Meta.automation[1] !== 'undefined')
                {
                    await sails.helpers.rest.cmd('PlayPlaylistTrack', 0);
                } else {
                    sails.helpers.rest.cmd('StopPlayer', 0);
                }
            }
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
