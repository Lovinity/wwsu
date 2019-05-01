module.exports = {

    friendlyName: 'int to week',

    description: 'Convert an integer into an object of dayOfWeek, hour, and minute.',

    inputs: {
        integer: {
            type: 'number',
            required: true
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        var currentValue = inputs.integer;

        var dayOfWeek = Math.floor(currentValue / 60 / 24);
        currentValue -= dayOfWeek * 60 * 24;

        var hour = Math.floor(currentValue / 60);
        currentValue -= hour * 60;

        var minute = currentValue;
        return exits.success({dayOfWeek: dayOfWeek, hour: hour, minute: minute});
    }


};

