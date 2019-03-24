/* global sails, Status, Meta */

module.exports = {

    friendlyName: 'config / radiodj / set',

    description: 'Add or update a radioDJ instance that the system should use.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            regex: /^[a-z0-9]+$/i,
            description: `An alpha-numeric name for this RadioDJ, which will be used to update/remove its configuration. If this name already exists, the provided configuration will replace the configuration of the given RadioDJ.`
        },

        label: {
            type: 'string',
            required: true,
            description: `A human friendly label to identify this RadioDJ (such as a room number). The word "RadioDJ " will automatically be prefixed to what is provided here.`
        },

        rest: {
            type: 'string',
            required: true,
            isURL: true,
            description: `The URL to the RadioDJ's active REST server. This needs to be accessible by the application. Also be aware the authentication password for the REST server must be what is configured for rest.auth.`
        },

        level: {
            type: 'number',
            required: true,
            min: 1,
            max: 5,
            description: `When this RadioDJ reports a problem, how severe should the system consider it? 5 = no issue, 4 = offline / no issue, 3 = minor, 2 = significant, 1 = critical.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/radiodj/set called.');

        try {

            // If the currently active radioDJ REST has been modified, we need to trigger a radiodj instance change (after the new configuration is saved).
            var changeRadioDj = false;
            sails.config.custom.radiodjs
                    .filter((radiodj) => radiodj.rest === Meta['A'].radiodj && radiodj.name === inputs.name && inputs.rest !== Meta['A'].radiodj)
                    .map(() => changeRadioDj = true);
            

            // Search for existing records and update if found. Otherwise, create a new record.
            var newRecord = true;
            sails.config.custom.radiodjs
                    .filter((radiodj) => radiodj.name === inputs.name)
                    .map((radiodj, index) => {
                        newRecord = false;
                        sails.config.custom.radiodjs[index] = inputs;
                    });

            if (newRecord)
            {
                sails.config.custom.radiodjs.push(inputs);
                // New RadioDJ instances need a new Status record
                await Status.findOrCreate({name: `radiodj-${inputs.name}`}, {name: `radiodj-${inputs.name}`, label: `RadioDJ ${inputs.label}`, status: inputs.level, data: 'This RadioDJ has not reported online since initialization.', time: null});
            }

            if (changeRadioDj)
            {
                // Forcefully clear the current active radioDJ since it no longer exists in configuration.
                await Meta.changeMeta({radiodj: ``});
                
                await sails.helpers.rest.changeRadioDj();
            }

            sails.sockets.broadcast('config', 'config', {update: {radiodjs: sails.config.custom.radiodjs}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


