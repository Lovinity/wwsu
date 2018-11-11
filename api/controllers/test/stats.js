/* global sails, Attendance */

module.exports = {

    friendlyName: 'Stats',

    description: 'Stats test.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        try {
            await sails.helpers.attendance.calculateStats();
            return exits.success(Attendance.weeklyAnalytics);
        } catch (e) {
            return exits.error(e);
        }
    }


};
