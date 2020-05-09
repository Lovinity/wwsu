module.exports = {

    friendlyName: 'logs / edit',

    description: 'Edit the excused or acknowledged state of a log entry (nothing else may be edited).',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the log entry to edit.'
        },

        acknowledged: {
            type: 'boolean',
            description: 'Change the acknowledged state of the log entry.'
        },

        excused: {
            type: 'boolean',
            description: 'Change the excused state of the log entry.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller logs/edit called.')

        try {
            var criteria = {};
            if (typeof inputs.acknowledged !== 'undefined')
                criteria.acknowledged = inputs.acknowledged;
            if (typeof inputs.excused !== 'undefined')
                criteria.excused = inputs.excused;

            var criteriaB = _.cloneDeep(criteria)

            await sails.models.logs.update({ ID: inputs.ID }, criteriaB).fetch();

            return exits.success()
        } catch (e) {
            return exits.error(e)
        }
    }

}