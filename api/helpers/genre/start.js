/* global sails, Events, Meta */

module.exports = {

    friendlyName: 'genre.start',

    description: 'Start a RadioDJ rotation.',

    inputs: {
        event: {
            type: 'string',
            defaultsTo: 'Default',
            description: 'Name of the manual RadioDJ event to fire to start the rotation.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper genre.start called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            var event = Events.find({type: 3, name: inputs.event, enabled: 'True'})
                    .intercept((err) => {
                        return exits.error(err);
                    });
            sails.log.verbose(`Events returned ${event.length} matched events, but we're only going to use the first one.`);
            sails.log.silly(event);

            if (event.length <= 0)
                return exits.error(new Error(`The provided event name was not found as an active manual event in RadioDJ.`));

            if (inputs.event !== 'Default')
            {
                await sails.helpers.rest.cmd('RefreshEvents', 0, 10000);
                await Meta.changeMeta({state: 'automation_genre', genre: inputs.genre});
                await sails.helpers.rest.cmd('EnableAutoDJ', 0);
                await sails.helpers.rest.removeMusic();
                await sails.helpers.rest.cmd('EnableAssisted', 0);
            }

            await sails.helpers.rest.cmd('RunEvent', event[0].ID, 5000);
            await sails.helpers.rest.cmd('EnableAutoDJ', 1);
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

