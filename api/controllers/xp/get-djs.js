/* global sails, Xp */

module.exports = {

    friendlyName: 'xp / get-djs',

    description: 'Retrieve a list of DJ monikors in the system.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller xp/get-djs called.');

        try {
            // Get DISTINCT records
            var records = await Xp.getDatastore().sendNativeQuery(`SELECT DISTINCT dj FROM xp`, []);

            sails.log.verbose(`Special records returned: ${records.length}`);
            sails.log.silly(records);

            return exits.success(records.rows);

        } catch (e) {
            return exits.error(e);
        }

    }


};
