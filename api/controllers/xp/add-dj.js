/* global moment, sails, Xp */

module.exports = {

    friendlyName: 'xp / add-dj',

    description: 'Add a DJ by entering an empty record into XP.',

    inputs: {
        dj: {
            type: 'string',
            required: true,
            description: 'The DJ to add.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller xp/add-dj called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            await Xp.create({dj: inputs.dj, type: 'add-dj', subtype: 'add-dj', description: "New DJ added to the system", amount: 0});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
