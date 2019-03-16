/* global moment, sails, Xp, Djs */
const bcrypt = require('bcrypt');
module.exports = {

    friendlyName: 'djs / add',

    description: 'Add a new DJ into the system. Call is ignored if a DJ with the same name already exists.',

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

        try {
            await Djs.findOrCreate({name: inputs.name}, {name: inputs.name, login: inputs.login !== null ? bcrypt.hashSync(inputs.login, 10) : null, lastSeen: moment("2002-01-01 00:00:00").toISOString(true)});
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
