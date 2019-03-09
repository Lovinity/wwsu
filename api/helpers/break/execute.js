/* global sails, Meta, Logs */

module.exports = {

    friendlyName: 'break.execute',

    description: 'Execute a configured break object.',

    inputs: {
        task: {
            type: 'string',
            required: true,
            description: 'Name of the break task to execute.'
        },
        event: {
            type: 'string',
            defaultsTo: ``,
            description: 'For log tasks, the event to log.'
        },
        category: {
            type: 'string',
            description: 'For queue tasks, the configured config.custom.categories to queue tracks from.'
        },
        quantity: {
            type: 'number',
            defaultsTo: 1,
            description: 'For tasks involving queuing of tracks or requests, number of tracks to queue.'
        },
        rules: {
            type: 'boolean',
            defaultsTo: false,
            description: 'For track queuing, If true, follow playlist rotation rules. Defaults to false.'
        }
    },

    exits: {
        success: {
            description: 'All done.',
        },
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper requests.get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            switch (inputs.task)
            {
                // Log an entry
                case "log":
                    await Logs.create({attendanceID: Meta['A'].attendanceID, logtype: 'break', loglevel: 'info', logsubtype: 'automation', event: inputs.event}).fetch()
                            .tolerate((err) => {
                            });
                    break;
                    // Add requested tracks
                case "queueRequests":
                    await sails.helpers.requests.queue(inputs.quantity, true, true);
                    break;
                    // Queue tracks from a configured categories.category
                case "queue":
                    await sails.helpers.songs.queue(sails.config.custom.subcats[inputs.category], 'Top', inputs.quantity, inputs.rules, null);
                    break;
                    // Re-queue any underwritings etc that were removed due to duplicate track checking
                case "queueDuplicates":
                    await sails.helpers.songs.queuePending();
                    break;
            }
            
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};

