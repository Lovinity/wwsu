module.exports = {

    friendlyName: 'Asyncforeach',

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
        for (let index = 0; index < inputs.array.length; index++) {
            try {
                await inputs.callback(inputs.array[index], index, inputs.array);
            } catch (e) {
                return exits.error(e);
                break;
            }
        }
        return exits.success();
    }


};

