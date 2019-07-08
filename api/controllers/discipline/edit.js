module.exports = {

    friendlyName: 'Discipline / Edit',

    description: 'Edit a discipline record.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the discipline record to edit.'
        },
        active: {
            type: 'boolean',
            description: 'Whether or not this discipline should be in effect.'
        },
        IP: {
            type: 'string',
            description: 'Either the IP address or unique host ID of the user to ban.'
        },
        action: {
            type: 'string',
            isIn: ['dayban', 'permaban', 'showban'],
            description: 'Type of ban: dayban (24 hours from createdAt), permaban (indefinite), show ban (until the current broadcast ends).'
        },
        message: {
            type: 'string',
            description: 'Reason for the discipline.'
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller discipline/edit called.');

        try {
            // Determine what needs editing
            var criteria = {};
            if (typeof inputs.active !== `undefined`)
                {criteria.active = inputs.active;}
            if (typeof inputs.IP !== `undefined`)
                {criteria.IP = inputs.IP;}
            if (typeof inputs.action !== `undefined`)
                {criteria.action = inputs.action;}
            if (typeof inputs.message !== `undefined`)
                {criteria.message = inputs.message;}

            var criteriaB = _.cloneDeep(criteria);

            await Discipline.update({ID: inputs.ID}, criteriaB).fetch();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }
    }


};
