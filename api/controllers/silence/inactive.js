/* global sails, Meta, Status, Logs */

module.exports = {

    friendlyName: 'Silence / Inactive',

    description: 'DJ Controls should call this endpoint after a silence issue has been resolved, and silence is no longer detected.',

    inputs: {
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
