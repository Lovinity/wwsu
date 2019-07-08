module.exports = {

    friendlyName: 'error.count helper',

    description: 'Count up an error. If a trigger is reached, execute its Status.errorCheck function.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            custom: function (value) {
                if (typeof Status.errorCheck[value] === 'object' && typeof Status.errorCheck[value].fn === 'function')
                    {return true;}
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

        try {

            // If the error count is zero and ignoreZero is specified, exit.
            if (Status.errorCheck[inputs.name].count === 0 && inputs.ignoreZero)
            {
                return exits.success();
            }

            // If the condition function exists and returns true, reset the error count to 0 and exit.
            if (typeof Status.errorCheck[inputs.name].condition === 'function' && await Status.errorCheck[inputs.name].condition())
            {
                sails.log.verbose(`Condition met. Error check reset to zero.`);
                await sails.helpers.error.reset(inputs.name);
                return exits.success();
            }

            // The active property ensures we are not actively processing this error already so that we don't execute an error trigger over another one.
            if (!Status.errorCheck[inputs.name].active)
            {
                // Bump the count.
                Status.errorCheck[inputs.name].count++;
                sails.log.verbose(`Count now at ${Status.errorCheck[inputs.name].count}`);

                // If the count is above or equal to the trigger value, trigger the error and reset the count to the trigger function's resolved number.
                if (Status.errorCheck[inputs.name].count >= Status.errorCheck[inputs.name].trigger)
                {
                    try {
                        sails.log.warn(`Status.errorCheck.${inputs.name} triggered!`);
                        Status.errorCheck[inputs.name].active = true;
                        Status.errorCheck[inputs.name].count = await Status.errorCheck[inputs.name].fn();
                        Status.errorCheck[inputs.name].active = false;
                        Status.errorCheck.prevError = moment();
                    } catch (unusedE) {
                        Status.errorCheck[inputs.name].count = Status.errorCheck[inputs.name].trigger;
                    }
                }
            }

            // All done.
            return exits.success();

        } catch (e) {
            return exits.error(e);
        }

    }


};

