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
        }
    },

    fn: async function (inputs, exits) {
        Status.errorCheck[inputs.name].count++;
        if (Status.errorCheck[inputs.name].count >= Status.errorCheck[inputs.name].trigger)
        {
            try {
                sails.log.error(new Error(`Status.errorCheck.${inputs.name} triggered!`));
                await Status.errorCheck[inputs.name].fn();
                Status.errorCheck.prevError = moment();
                await Logs.create({logtype: 'system', loglevel: 'warn', logsubtype: '', event: `Status.errorCheck.${inputs.name} triggered!`})
                        .intercept((err) => {
                        });
                Status.errorCheck[inputs.name].count = 0;
            } catch (e) {
                Status.errorCheck[inputs.name].count = Status.errorCheck[inputs.name].trigger;
            }
        }

        // All done.
        return exits.success();

    }


};

