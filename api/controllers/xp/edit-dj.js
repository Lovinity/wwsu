/* global sails, Xp, Attendance */

module.exports = {

    friendlyName: 'xp / edit-dj',

    description: 'Change the name of a DJ in all XP records.',

    inputs: {
        old: {
            type: 'string', 
            required: true,
            description: 'The monikor of the DJ being edited.'
        },
        new : {
            type: 'string',
            required: true,
            description: 'The new monikor for the DJ.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller xp/edit-dj called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {
            
            // Update all XP records to the new DJ name
            await Xp.update({dj: inputs.old}, {dj: inputs.new});
            
            // Update all attendance records to the name of the new DJ
            await Attendance.update({DJ: inputs.old}, {DJ: inputs.new});

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
