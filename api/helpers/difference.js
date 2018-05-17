/* global sails */

module.exports = {

    friendlyName: 'difference',

    description: 'Determine the differences between two objects.',

    inputs: {
        o1: {
            required: true,
            type: 'json'
        },
        o2: {
            required: true,
            type: 'json'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper difference called.');
        var o1 = inputs.o1;
        var o2 = inputs.o2;
        var k, kDiff,
                diff = {};
        for (k in o1) {
            if (!o1.hasOwnProperty(k)) {
            } else if (typeof o1[k] !== 'object' || typeof o2[k] !== 'object') {
                if (!(k in o2) || o1[k] !== o2[k]) {
                    diff[k] = o2[k];
                }
            } else if (kDiff === sails.helpers.difference(o1[k], o2[k])) {
                diff[k] = kDiff;
            }
        }
        for (k in o2) {
            if (o2.hasOwnProperty(k) && !(k in o1)) {
                diff[k] = o2[k];
            }
        }
        for (k in diff) {
            if (diff.hasOwnProperty(k)) {
                return exits.success(diff);
            }
        }
        return exits.success({});
    }


};

