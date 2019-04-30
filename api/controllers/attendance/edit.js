/* global moment, sails, Xp, Djs, Directors, _ */
const bcrypt = require('bcrypt');
module.exports = {

    friendlyName: 'directors / edit',

    description: 'Edit one of the directors in the system.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the attendance record to edit.'
        },

        happened: {
            type: 'number',
            description: 'Change the happening status... 1 = happened, 0 = unexcused absence, -1 = excused cancellation'
        },

        ignore: {
            type: 'number',
            description: '0 = do not ignore, 1 = do not count towards reputation %, 2 = do not count towards reputation % nor any reputation stats'
        },
    },

    exits: {
        conflict: {
            statusCode: 409
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller attendance/edit called.');

        try {

            // Determine what needs updating
            var criteria = {};
            
            if (typeof inputs.happened !== 'undefined' && inputs.happened !== null)
                criteria.happened = inputs.happened;

            if (typeof inputs.ignore !== 'undefined' && inputs.ignore !== null)
                criteria.ignore = inputs.ignore;

            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
            var criteriaB = _.cloneDeep(criteria);

            // Edit it
            await Attendance.update({ID: inputs.ID}, criteriaB).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};


