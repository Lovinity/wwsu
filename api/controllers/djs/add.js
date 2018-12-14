/* global moment, sails, Xp, Djs */

module.exports = {

    friendlyName: 'djs / add',

    description: 'Add a new DJ into the system.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            description: 'The DJ to add.'
        },
        
        login: {
            type: 'string',
            allowNull: true,
            description: 'The login used for DJ-related settings.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller djs/add called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            await Djs.findOrCreate({name: inputs.name}, {name: inputs.name, login: inputs.login || null}).fetch();
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
