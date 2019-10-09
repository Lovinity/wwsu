/* global moment, sails, Xp, Djs, Directors */
const bcrypt = require('bcrypt');
module.exports = {

    friendlyName: 'uab / directors / add',

    description: 'Add a new UAB director into the system.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            description: 'The director to add.'
        },

        login: {
            type: 'string',
            required: true,
            description: 'The login used for the clock-in and clock-out computer.'
        },

        admin: {
            type: 'boolean',
            defaultsTo: false,
            description: 'Is this director an administrator? Defaults to false.'
        },

        position: {
            type: 'string',
            required: true,
            description: 'The description of the position of this director (such as general manager).'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller uab/directors/add called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            await sails.models.uabdirectors.create({name: inputs.name, login: bcrypt.hashSync(inputs.login, 10), admin: inputs.admin, position: inputs.position, present: false, since: moment().toISOString()}).fetch();
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};