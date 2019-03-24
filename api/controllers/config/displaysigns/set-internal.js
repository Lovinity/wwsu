/* global sails, moment */

module.exports = {

    friendlyName: 'config / displaysigns / set-internal',

    description: 'Change the configuration for the internal display signs',

    inputs: {
        level: {
            type: 'number',
            min: 1,
            max: 5,
            description: `What level should be triggered when there are less than instances number of display signs connected? 5 = good, 4 = offline/good, 3 = minor, 2 = significant, 1 = critical.`
        },
        instances: {
            type: 'number',
            description: `How many signs should be connected to display/internal for this to be considered good?`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/displaysigns/set-internal called.');

        try {
            // Make changes
            sails.config.custom.displaysigns
                    .filter((sign) => sign.name === `internal`)
                    .map((sign, index) => {
                        if (typeof inputs.level !== `undefined`)
                            sails.config.custom.displaysigns[index].level = inputs.level;

                        if (typeof inputs.instances !== `undefined`)
                            sails.config.custom.displaysigns[index].instances = inputs.instances;
                    });

            // Add and remove a dummy public display sign recipient so we can update the status according to the new configuration.
            await sails.helpers.recipients.add(`DUMMY`, `display-internal`, 'display', `DUMMY`);
            await sails.helpers.recipients.remove(`DUMMY`, `display-internal`);

            // broadcast changes over websockets
            sails.sockets.broadcast('config', 'config', {update: {displaysigns: sails.config.custom.displaysigns}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


