/* global Eas */

module.exports = {

    friendlyName: 'eas.preParse',

    description: 'Execute this helper when beginning routine pulling of EAS alerts from external sources. This clears some variables in preparation.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper eas.preParse called.');
        Eas.activeCAPS = [];
        return exits.success();
    }


};

