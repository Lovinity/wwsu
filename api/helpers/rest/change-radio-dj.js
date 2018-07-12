/* global sails, Meta */

module.exports = {

    friendlyName: 'helper rest.changeRadioDj',

    description: 'Change which RadioDJ instance is the active one.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug(`Helper sails.helpers.rest.changeRadioDj called.`);
        try {
            var runninginstance = 0;

            // Determine which instance we should switch to
            sails.config.custom.radiodjs.forEach(function (instance, index) {
                if (instance.rest === Meta['A'].radiodj)
                    runninginstance = index;
            });
            
            sails.log.verbose(`INSTANCE ${runninginstance}`);
            
            runninginstance += 1;
            if ((runninginstance >= sails.config.custom.radiodjs.length))
            {
                sails.log.verbose(`RESTARTING to 0.`);
                runninginstance = 0;
            }

            // Change the instance
            sails.log.debug('USING instance ' + runninginstance + ' which translates to ' + sails.config.custom.radiodjs[runninginstance].name);
            await Meta.changeMeta({radiodj: sails.config.custom.radiodjs[runninginstance].rest});

            // All done.
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

