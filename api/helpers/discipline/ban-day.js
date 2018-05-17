/* global sails, Meta, Discipline */

module.exports = {

    friendlyName: 'Discipline / banDay',

    description: 'Ban a specified host for 24 hours.',

    inputs: {
        host: {
            required: true,
            type: 'string',
            description: 'The unique ID assigned to the host that we are banning.'
        }
    },

    fn: async function (inputs, exits) {

        try {
            await sails.helpers.messages.removeMass(inputs.host);
            await Discipline.create({active: 1, IP: inputs.host, action: 'dayban', message: `The website user was banned for 24 hours by ${Meta['A'].dj}`}).fetch()
                    .intercept((err) => {
                        return exits.error(err);
                    });
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

