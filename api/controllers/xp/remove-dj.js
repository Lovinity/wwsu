/* global moment, sails, Xp, Attendance */

module.exports = {

    friendlyName: 'xp / remove-dj',

    description: 'Remove a DJ from XP records.',

    inputs: {
        dj: {
            type: 'string',
            required: true,
            description: 'The DJ to remove.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller xp/remove-dj called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            
            // Destroy all XP and remotes earned by this DJ
            await Xp.destroy({dj: inputs.dj});
            
            // Disassociate this DJ from all Attendance records, but leave the records themselves in the system.
            await Attendance.update({DJ: inputs.dj}, {DJ: ``});
            
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};