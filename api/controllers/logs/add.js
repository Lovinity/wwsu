/* global sails, Logs, moment, Meta */

module.exports = {

    friendlyName: 'logs / add',

    description: 'Add a log entry into the system.',

    inputs: {
        date: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            allowNull: true,
            description: `moment() parsable string of a date in which this log took place. Defaults to now.`
        },
        logtype: {
            type: 'string',
            required: true,
            description: 'Category of log.'
        },
        loglevel: {
            type: 'string',
            required: true,
            isIn: ['danger', 'urgent', 'warning', 'info', 'success', 'primary', 'secondary'],
            description: 'Log severity: danger, urgent, warning, info, success, primary, or secondary.'
        },

        logsubtype: {
            type: 'string',
            allowNull: true,
            description: 'Log subcategory / subtype, such as a radio show name.'
        },

        event: {
            type: 'string',
            required: true,
            description: 'The log event / what happened, plus any data (other than track information).'
        },

        trackArtist: {
            type: 'string',
            allowNull: true,
            description: 'If a track was played, the artist of the track, used for spin counts.'
        },

        trackTitle: {
            type: 'string',
            allowNull: true,
            description: 'If a track was played, the title of the track, used for spin counts.'
        },

        trackAlbum: {
            type: 'string',
            allowNull: true,
            description: 'If a track was played, the album of the track.'
        },

        trackLabel: {
            type: 'string',
            allowNull: true,
            description: 'If a track was played, the record label of the track.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller logs/add called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Create the log entry
            await Logs.create({logtype: inputs.logtype, loglevel: inputs.loglevel, logsubtype: inputs.logsubtype, event: inputs.event, trackArtist: inputs.trackArtist, trackTitle: inputs.trackTitle, trackAlbum: inputs.trackAlbum, trackLabel: inputs.trackLabel, createdAt: inputs.date !== null && typeof inputs.date !== 'undefined' ? moment(inputs.date).toISOString(true) : moment().toISOString(true)});

            // Set manual meta if criteria matches
            if (inputs.logtype === 'manual' && inputs.trackArtist !== null && inputs.trackTitle !== null)
            {
                await Meta.changeMeta({track: `${inputs.trackArtist} - ${inputs.trackTitle}`, trackstamp: moment(inputs.date)});
            }

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
