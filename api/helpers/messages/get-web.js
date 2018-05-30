/* global Messages, sails, moment */

module.exports = {

    friendlyName: 'messages.getWeb',

    description: 'Get messages for a specified web client.',

    inputs: {
        host: {
            type: 'string',
            required: true,
            description: 'The unique ID of the client retrieving messages.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper messages.getWeb called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        var searchto = moment().subtract(1, 'hours').toDate(); // Do not return messages more than 1 hour old
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
                sails.log.verbose(`Messages records retrieved: ${records.length}`);
                sails.log.silly(records);
        if (typeof records === 'undefined' || records.length === 0)
        {
            return exits.success([]);
        } else {
            // Remove IP addresses from response!
            records.forEach(function (record, index) {
                if (typeof records[index].from_IP !== 'undefined')
                    delete records[index].from_IP;
            });

            return exits.success(records);
        }

    }


};

