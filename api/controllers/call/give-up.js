/* global moment, sails, Xp, Djs, Directors */
const bcrypt = require('bcrypt');
module.exports = {

    friendlyName: 'call / give-up',

    description: 'If remote audio continues to be poor quality, call this to trigger very-bad-call socket event.',

    inputs: {
    },

    exits: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller call/give-up called.');

        try {
            sails.sockets.broadcast('very-bad-call', 'very-bad-call', true);
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

