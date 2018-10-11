/* global sails, Meta, Status, Logs */

module.exports = {

    friendlyName: 'Silence / Inactive',

    description: 'Silence detection program should hit this endpoint when previously detected silence has been resolved.',

    inputs: {
        key: {
            type: 'string',
            required: true,
            custom: function (value) {
                return value === sails.config.custom.silence.key;
            },
            description: 'Secret key that the silence detection program must pass as a parameter.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller silence/inactive called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
        try {
            // Status for silence set to good
            Status.changeStatus([{name: `silence`, status: 5, label: `Silence`, data: `Audio levels are acceptable.`}]);
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};
