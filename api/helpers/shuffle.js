/* global _ */

module.exports = {

    friendlyName: 'Shuffle',

    description: 'Shuffle an array.',

    inputs: {
        array: {
            type: 'ref',
            required: true,
            custom: function(value) {
                return _.isArray(value);
            }
        }

    },

    fn: async function (inputs, exits) {
        var currentIndex = inputs.array.length, temporaryValue, randomIndex;

        // While there remain elements to shuffle...
        while (0 !== currentIndex) {

            // Pick a remaining element...
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex -= 1;

            // And swap it with the current element.
            temporaryValue = inputs.array[currentIndex];
            inputs.array[currentIndex] = inputs.array[randomIndex];
            inputs.array[randomIndex] = temporaryValue;
        }

        return exits.success(inputs.array);

    }


};

