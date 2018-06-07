/* global Status, sails, Logs */

module.exports = {

    friendlyName: 'error.count helper',

    description: 'Count up an error. If a trigger is reached, execute its Status.errorCheck function.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            custom: function (value) {
                if (typeof Status.errorCheck[value] === 'object' && typeof Status.errorCheck[value].fn === 'function')
                    return true;
                return false;
            },
            description: 'Name of the Status.errorCheck key to count.'
        },

        ignoreZero: {
            type: 'boolean',
            defaultsTo: false,
            description: 'If true, count will not count if the counter is at zero.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper error.count called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        if (Status.errorCheck[inputs.name].count === 0 && inputs.ignoreZero)
        {
            return exits.success();
        }
        if (typeof Status.errorCheck[inputs.name].condition === 'function' && await Status.errorCheck[inputs.name].condition())
        {
            sails.log.verbose(`Condition met. Error check reset to zero.`);
            await sails.helpers.error.reset(inputs.name);
            return exits.success();
        }
        Status.errorCheck[inputs.name].count++;
        sails.log.verbose(`Count now at ${Status.errorCheck[inputs.name].count}`);
        if (Status.errorCheck[inputs.name].count >= Status.errorCheck[inputs.name].trigger)
        {
            try {
                sails.log.warn(`Status.errorCheck.${inputs.name} triggered!`);
                Status.errorCheck[inputs.name].count = await Status.errorCheck[inputs.name].fn();
                Status.errorCheck.prevError = moment();
                await Logs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: `Status.errorCheck.${inputs.name} triggered!`})
                        .tolerate((err) => {
                        });
            } catch (e) {
                Status.errorCheck[inputs.name].count = Status.errorCheck[inputs.name].trigger;
            }
        }

        // All done.
        return exits.success();

    }


};

