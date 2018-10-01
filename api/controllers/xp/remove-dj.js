/* global moment, sails, Xp */

module.exports = {

    friendlyName: 'xp / remove-dj',

    description: 'Remove a DJ from XP records.',

    inputs: {
        dj: {
            type: 'string',
            required: true,
            description: 'The DJ to remove.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller xp/remove-dj called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            await Xp.destroy({dj: inputs.dj});
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};