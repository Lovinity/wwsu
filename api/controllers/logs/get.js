/* global sails, moment, Logs */

module.exports = {

    friendlyName: 'Logs / get',

    description: 'Retrieve a list of log entries.',

    inputs: {
        subtype: {
            type: 'string',
            defaultsTo: '',
            description: 'The log subtype to retrieve.'
        },

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
        sails.log.debug('Controller logs/get called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            // Get date range
            var start = inputs.date !== null ? moment(inputs.date).startOf('day') : moment().startOf('day');
            var end = moment(start).add(1, 'days');
            var query = {createdAt: {'>=': start.toISOString(true), '<': end.toISOString(true)}};
            if (inputs.subtype === "ISSUES")
            {
                query.loglevel = ['warning', 'urgent', 'danger'];
            } else if (inputs.subtype !== '' && inputs.subtype !== null)
            {
                query.logsubtype = inputs.subtype;
            }

            // Get records
            var records = await Logs.find(query).sort('createdAt ASC');

            sails.log.verbose(`Retrieved Logs records: ${records.length}`);
            sails.log.silly(records);

            return exits.success(records);

        } catch (e) {
            return exits.error(e);
        }

    }


};
