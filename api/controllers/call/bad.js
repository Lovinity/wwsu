/* global moment, sails, Xp, Djs, Directors */
const bcrypt = require('bcrypt');
module.exports = {

    friendlyName: 'call / bad',

    description: 'Transmit socket event indicating the currently connected call is of bad quality.',

    inputs: {
    },

    exits: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller call/bad called.');

        try {
            sails.sockets.broadcast('bad-call', 'bad-call', true);
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


