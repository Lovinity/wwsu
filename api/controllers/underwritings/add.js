module.exports = {

    friendlyName: 'Underwritings / Add',

    description: 'Add an underwriting record.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            description: "Name for the underwriting entry."
        },
        trackID: {
            type: "number",
            required: true,
            description: "ID of the track in RadioDJ that this underwriting is associated with."
        },
        mode: {
            type: "json",
            required: true,
            custom: (value) => {
                if (typeof value.mode === `undefined` || (value.mode !== 0 && value.mode !== 1))
                    return false;

                if (typeof value.schedule === `undefined`)
                    return false;

                if (typeof value.schedule.schedules === `undefined`)
                    return false;

                return true;
            },
            description: "Mode data for this underwriting."
        },
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug("Controller underwritings/add called.");

        try {

            await Underwritings.create({ name: inputs.name, trackID: inputs.trackID, mode: inputs.mode }).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};