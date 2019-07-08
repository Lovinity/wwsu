module.exports = {

    friendlyName: 'Underwritings / Add',

    description: 'Add an underwriting record.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            description: 'Name for the underwriting entry.'
        },
        trackID: {
            type: 'number',
            required: true,
            description: 'ID of the track in RadioDJ that this underwriting is associated with.'
        },
        mode: {
            type: 'json',
            required: true,
            custom: (value) => {
                // Underwritings mode parameter must have a mode property with a value of 0 or 1
                if (typeof value.mode === `undefined` || (value.mode !== 0 && value.mode !== 1))
                    {return false;}

                // Underwritings mode parameter must have a schedule property
                if (typeof value.schedule === `undefined`)
                    {return false;}

                // Underwritings mode parameter schedule property must have a schedules property
                if (typeof value.schedule.schedules === `undefined`)
                    {return false;}

                // Underwritings mode parameter must have a scheduleForced property
                if (typeof value.scheduleForced === `undefined`)
                    {return false;}

                // Underwritings mode parameter scheduleForced property must have a schedules property
                if (typeof value.scheduleForced.schedules === `undefined`)
                    {return false;}

                return true;
            },
            description: 'Mode data for this underwriting.'
        },
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller underwritings/add called.');

        try {

            // Add the underwriting to the database
            await Underwritings.create({ name: inputs.name, trackID: inputs.trackID, mode: inputs.mode }).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};
