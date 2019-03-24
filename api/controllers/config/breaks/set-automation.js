/* global sails */

module.exports = {

    friendlyName: 'config / breaks / set-automation',

    description: 'Set what is queued during breaks in automation.',

    inputs: {
        during: {
            type: 'json',
            custom: (value) => sails.helpers.break.validate(value),
            description: `Automation / during is executed when a DJ "Switches show" and goes to automation_break. It is repeatedly executed whenever the queue empties until either the break times out, or another show begins.`
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/breaks/set-automation called.');

        try {
            for (var key in inputs)
            {
                if (inputs.hasOwnProperty(key))
                {
                    sails.config.custom.specialBreaks.automation[key] = inputs[key];
                }
            }
            
            sails.sockets.broadcast('config', 'config', {update: {specialBreaks: sails.config.custom.specialBreaks}});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

