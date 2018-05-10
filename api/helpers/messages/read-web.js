var moment = require('moment');

module.exports = {

    friendlyName: 'messages / readWeb',

    description: 'Get messages for a specified web client.',

    inputs: {
        host: {
            type: 'string',
            required: true,
            description: 'The unique ID of the client retrieving messages.'
        }
    },

    fn: async function (inputs, exits) {
        var searchto = moment().subtract(1, 'hours').toDate();
        var records = await Messages.find(
                {
                    status: 'active',
                    createdAt: {'>': searchto},
                    or: [
                        {to: ['website', `website-${inputs.host}`]},
                        {from: {'startsWith': 'website'}, to: 'DJ'},
                        {from: `website-${inputs.host}`, to: 'DJ-private'}
                    ]
                })
                .intercept((err) => {
                    return exits.error(err);
                });
        if (typeof records == 'undefined' || records.length == 0)
        {
            return exits.success([]);
        } else {
            return exits.success(records);
        }

    }


};

