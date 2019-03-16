/* global Djs, sails, Xp, Attendance, Listeners, Meta */

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

        try {

            // Update all attendance records to null DJ
            await Attendance.update({dj: inputs.ID}, {dj: null}).fetch();

            // Update all listeners records to null DJ
            await Listeners.update({dj: inputs.ID}, {dj: null}).fetch();

            // Destroy XP records
            await Xp.destroy({dj: inputs.ID}).fetch();

            // Destroy DJ
            await Djs.destroy({ID: inputs.ID}).fetch();

            // Edit meta if necessary
            if (Meta['A'].dj === inputs.ID)
                Meta.changeMeta({dj: null});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};