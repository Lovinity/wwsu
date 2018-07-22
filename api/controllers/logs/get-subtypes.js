/* global moment, sails, Logs */

module.exports = {

    friendlyName: 'logs / get-subtypes',

    description: 'Retrieve a list of log subtypes for a particular day.',

    inputs: {
        date: {
            type: 'string',
            custom: function (value) {
                return moment(value).isValid();
            },
            allowNull: true,
            description: `moment() parsable string of a date to get logs.`
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller logs/get-subtypes called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Get date range
            var start = inputs.date !== null ? moment(inputs.date).startOf('day') : moment().startOf('day');
            var end = moment(start).add(1, 'days');

            // Get DISTINCT records
            var records = await Logs.getDatastore().sendNativeQuery(`SELECT DISTINCT logsubtype FROM logs WHERE (createdAt BETWEEN "${start.toISOString(true)}" AND "${end.toISOString(true)}") AND logsubtype IS NOT NULL AND logsubtype NOT LIKE ''`, []);

            sails.log.verbose(`Special records returned: ${records.length}`);
            sails.log.silly(records);

            return exits.success(records.rows);

        } catch (e) {
            return exits.error(e);
        }

    }


};
