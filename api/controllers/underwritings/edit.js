module.exports = {

    friendlyName: 'Underwritings / Edit',

    description: 'Edit an underwriting record.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: "The ID of the underwriting record to edit."
        },
        name: {
            type: 'string',
            description: "New name for the underwriting entry."
        },
        trackID: {
            type: "number",
            description: "Updated ID of the track in RadioDJ that this underwriting is associated with."
        },
        mode: {
            type: "json",
            custom: (value) => {
                if (typeof value.mode === `undefined` || (value.mode !== 0 && value.mode !== 1))
                    return false;

                if (value.mode === 0) {
                    if (typeof value.times === `undefined`)
                        return false;

                    if (typeof value.schedule === `undefined`)
                        return false;

                    if (typeof value.schedule.schedules === `undefined`)
                        return false;
                }

                return true;
            },
            description: "Mode data for this underwriting."
        },
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug("Controller underwritings/edit called.");

        try {
            var criteria = {};
            if (typeof inputs.name !== `undefined`)
                criteria.name = inputs.name;
            if (typeof inputs.trackID !== `undefined`)
                criteria.trackID = inputs.trackID;
            if (typeof inputs.mode !== `undefined`)
                criteria.mode = inputs.mode;

            var criteriaB = _.cloneDeep(criteria);

            await Underwritings.update({ ID: inputs.ID }, criteriaB).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};