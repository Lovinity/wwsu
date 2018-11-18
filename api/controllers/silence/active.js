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
            Status.changeStatus([{name: `silence`, status: 2, label: `Silence`, data: `Silence / very low audio detected.`}]);

            // If a track is playing in RadioDJ, skip it and log it
            if (typeof Meta.automation[0] !== 'undefined' && parseInt(Meta.automation[0].ID) !== 0)
            {
                // Add a log about the track
                await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'silence-track', loglevel: 'warning', logsubtype: Meta['A'].dj, event: `Track skipped due to silence.<br />Track: ${Meta.automation[0].ID} (${Meta.automation[0].Artist} - ${Meta.automation[0].Title})`})
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
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
