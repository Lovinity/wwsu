/* global sails, Meta */

module.exports = {

    friendlyName: 'helper rest.changeRadioDj',

    description: 'Change which RadioDJ instance is the active one.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debig(`Helper sails.helpers.rest.changeRadioDj called.`);

        try {
            var runninginstance = 0;
            
            // Determine which instance we should switch to
            sails.config.custom.radiodjs.forEach(function(instance, index) {
               if (instance.rest === Meta['A'].radiodj)
                   runninginstance = index;
            });
            runninginstance += 1;
            if ((runninginstance >= sails.config.custom.radiodjs))
                runninginstance = 0;
            
            // Change the instance
            sails.log.debug('Using instance ' + runninginstance + ' which translates to ' + sails.config.custom.radiodjs[runninginstance].name);
            await Meta.changeMeta({radiodj: sails.config.custom.radiodjs[runninginstance].name});
        } catch (e) {
            return exits.error(e);
        }

        // All done.
        return exits.success();

    }


};

