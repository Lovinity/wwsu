/* global _, sails */

module.exports = {

    friendlyName: 'asyncForEach',

    description: 'This helper should be used instead of Array.prototype.forEach() when you need to perform an async function for each item in an array.',

    inputs: {
        array: {
            type: 'ref',
            custom: function (value) {
                return _.isArray(value);
            },
            description: 'The array to be iterated.'
        },
        callback: {
            type: 'ref',
            custom: function (value) {
                return _.isFunction(value);
            },
            description: 'A function that should be called with each item in the array. Passes in parameters (array[index], index, array).'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper asyncForEach called.');
        try {
            for (let index = 0; index < inputs.array.length; index++) {
                sails.log.silly(`Calling iteration ${index}`);
                var breakIt = await inputs.callback(inputs.array[index], index, inputs.array);
                if (breakIt) // If a loop iteration resolves with true, break the forEach loop.
                {
                    sails.log.silly(`BREAKING as per resolve(true).`);
                    break;
                }
            }
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};

