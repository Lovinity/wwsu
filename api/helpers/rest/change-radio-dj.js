module.exports = {

    friendlyName: 'helper rest.changeRadioDj',

    description: 'Change which RadioDJ instance is the active one.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug(`Helper sails.helpers.rest.changeRadioDj called.`);
        try {

            // Determine which inactive RadioDJs are healthy (status 5).
            var healthyRadioDJs = [];
            var maps = sails.config.custom.radiodjs.map(async (instance) => {
                if (instance.rest === Meta['A'].radiodj)
                    {return false;}
                var status = await Status.findOne({name: `radiodj-${instance.name}`});
                if (status && status.status === 5)
                    {healthyRadioDJs.push(instance);}
                return true;
            });
            await Promise.all(maps);

            // If there is at least one healthy inactive RadioDJ, choose one randomly to switch to
            if (healthyRadioDJs.length > 0)
            {
                var changeTo = await sails.helpers.pickRandom(healthyRadioDJs);
                await Meta.changeMeta({radiodj: changeTo.item.rest});

                // Otherwise, check to see if the active RadioDJ is still status 5
            } else {
                maps = sails.config.custom.radiodjs
                        .filter((instance) => instance.rest === Meta['A'].radiodj)
                        .map(async (instance) => {
                            var status = await Status.findOne({name: `radiodj-${instance.name}`});
                            // If the current RadioDJ is also not status 5, we have a huge problem! Trigger critical status, and wait for a good RadioDJ to report
                            if (!status || status.status !== 5)
                            {
                                Status.errorCheck.waitForGoodRadioDJ = true;
                                await Status.changeStatus([{name: `radiodj-${instance.name}`, label: `RadioDJ ${instance.label}`, status: 1, data: `None of the configured RadioDJ instances are reporting operational! Waiting for one to report operational to switch to.`}]);
                                // Throw an error so that error.post does not get called, which is sometimes called after this helper finishes.
                                throw new Error(`There are no healthy RadioDJ instances to switch to at this time.`);
                            }
                            return true;
                        });
                await Promise.all(maps);
            }

            // All done.
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

