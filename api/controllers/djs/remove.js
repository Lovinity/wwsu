/* global Djs, sails, Xp, Attendance, Listeners */

module.exports = {

    friendlyName: 'djs / remove',

    description: 'Remove a DJ from the system.',

    inputs: {
        dj: {
            type: 'number',
            required: true,
            description: 'The DJ ID to remove.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller djs/remove called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {

            // Update all attendance records to null DJ
            await Attendance.update({DJ: inputs.dj}, {DJ: null}).fetch();

            // Update all listeners records to null DJ
            await Listeners.update({dj: inputs.dj}, {dj: null}).fetch();

            // Destroy XP records
            await Xp.destroy({dj: inputs.dj});

            // Destroy DJ
            await Djs.destroy({ID: inputs.dj});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};