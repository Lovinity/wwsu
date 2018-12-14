/* global moment, Listeners, sails */

module.exports = {

    friendlyName: 'listeners / get',

    description: 'Get an array of listener counts between a specified time period.',

    inputs: {
        start: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            required: true,
            description: `moment() parsable string of the earliest point in time to get listener counts (system may return one record before this time as a baseline). Recommended ISO string.`
        },

        end: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            required: true,
            description: `moment() parsable string of the latest point in time to get listener counts. Recommended ISO string.`
        },
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller listeners/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            var records = [];
            var start = moment(inputs.start);
            var end = moment(inputs.end);
            
            // First, get the listeners within the given range
            var records1 = await Listeners.find({createdAt: {'>=': start.toISOString(true), '<': end.toISOString(true)}}).sort('createdAt ASC');
            
            if (records1)
                records = records.concat(records1);
            
            // If the earliest returned record still falls after the provided start time, add the latest record before the provided start time as a baseline.
            if (typeof records1[0] === 'undefined' || moment(start).isBefore(moment(records1[0].createdAt)))
            {
                var records2 = await Listeners.find({createdAt: {'<': start.toISOString(true)}}).sort('createdAt DESC').limit(1);
                if (records2)
                    records = records2.concat(records);
            }

            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }

    }


};
