module.exports = {

    friendlyName: 'config / breaks / set-clock',

    description: 'Add, set, or remove a clockwheel break',

    inputs: {
        minute: {
            type: 'number',
            min: 0,
            max: 59,
            required: true,
            description: `The minute number to add or update breaks for`
        },

        tasks: {
            type: 'json',
            custom: (value) => sails.helpers.break.validate(value),
            description: `An array of properly formatted break task objects to set for the provided break minute. If an ampty array is provided, or no array is provided, the break will be removed.`,
            defaultsTo: []
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/breaks/set-clock called.');

        try {

            // If an ampty tasks array was provided, delete this break and exit, unless the provided minute was 0 (never delete break 0).
            if (inputs.tasks.length < 1 && inputs.minute !== 0)
            {
                delete sails.config.custom.breaks[inputs.minute];
            } else
            {
                sails.config.custom.breaks[inputs.minute] = inputs.tasks;
            }

            // Transmit new config through socket
            sails.sockets.broadcast('config', 'config', {update: {breaks: sails.config.custom.breaks}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


