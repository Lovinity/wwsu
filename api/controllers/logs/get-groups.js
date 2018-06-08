/* global moment, sails, Logs */

module.exports = {

    friendlyName: 'logs / get-groups',

    description: 'Retrieve a list of log subtypes for a particular day.',

    inputs: {
        date: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            defaultsTo: moment().toISOString(),
            description: `moment() parsable string of a date to get logs.`
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller logs/get-groups called.');
        sails.log.silly(`Parameters passed: ${inputs}`);

        try {
            // Get date range
            var start = moment(inputs.date).startOf('day');
            var end = moment(start).add(1, 'days');

            // Get DISTINCT records
            var records = await Logs.getDatastore().sendNativeQuery(`SELECT DISTINCT logsubtype FROM logs WHERE (createdAt BETWEEN ? AND ?) AND logsubtype IS NOT NULL AND logsubtype NOT LIKE ''`, [start.toISOString(), end.toISOString()]);

            sails.log.verbose(`Special records returned: ${records.length}`);
            sails.log.silly(records);

            return exits.success(records);

        } catch (e) {
            return exits.error(e);
        }

    }


};
