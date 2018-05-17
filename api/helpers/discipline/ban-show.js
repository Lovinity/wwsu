/* global sails, Meta, Discipline */

module.exports = {

    friendlyName: 'discipline.banShow',

    description: 'Issue a ban on a specified host, expiring when the current show ends.',

    inputs: {
        host: {
            required: true,
            type: 'string',
            description: 'The unique ID assigned to the host that we are banning.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper discipline.banShow called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            await sails.helpers.messages.removeMass(inputs.host);
            await Discipline.create({active: 1, IP: inputs.host, action: 'showban', message: `The website user was show-banned by ${Meta['A'].dj}`}).fetch()
                    .intercept((err) => {
                        return exits.error(err);
                    });
            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

