/* global sails, Xp, Attendance, _, Djs, Listeners, Promise */

module.exports = {

    friendlyName: 'djs / edit',

    description: 'Change the name or login of a DJ.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the dj to edit.'
        },
        name: {
            type: 'string',
            allowNull: true,
            description: 'The new name for the DJ.'
        },
        login: {
            type: 'string',
            allowNull: true,
            description: 'The new login for the DJ.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller djs/edit called.');
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

        try {

            // Determine what needs updating
            var criteria = {};
            if (inputs.name !== null && typeof inputs.name !== 'undefined')
            {
                criteria.name = inputs.name;

                // Merge other DJ entries with the same name with this one
                var dj = await Djs.find({name: inputs.name});
                if (dj && dj.length > 0)
                {
                    var maps = dj.map(async record => {

                        // Update all XP records
                        await Xp.update({dj: record.ID}, {dj: inputs.ID}).fetch();

                        // Update all attendance records
                        await Attendance.update({dj: record.ID}, {dj: inputs.ID}).fetch();

                        // Update all listeners records
                        await Listeners.update({dj: record.ID}, {dj: inputs.ID}).fetch();
                        
                        // Remove the original record
                        await Djs.destroy({ID: record.ID}).fetch();
                    });
                    await Promise.all(maps);
                }
            }
            
            if (inputs.login !== null && typeof inputs.login !== 'undefined')
                criteria.login = inputs.login;

            // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
            var criteriaB = _.cloneDeep(criteria);

            // Edit it
            await Djs.update({ID: inputs.ID}, criteriaB).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
