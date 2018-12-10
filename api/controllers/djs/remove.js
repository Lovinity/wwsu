/* global Djs, sails, Xp, Attendance, Listeners */

module.exports = {

    friendlyName: 'djs / remove',

    description: 'Remove a DJ from the system.',

    inputs: {
        ID: {
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
            await Attendance.update({dj: inputs.ID}, {dj: null}).fetch();

            // Update all listeners records to null DJ
            await Listeners.update({dj: inputs.ID}, {dj: null}).fetch();

            // Destroy XP records
            await Xp.destroy({dj: inputs.ID}).fetch();

            // Destroy DJ
            await Djs.destroy({ID: inputs.ID}).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};