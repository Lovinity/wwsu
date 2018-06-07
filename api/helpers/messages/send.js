/* global sails, Hosts, Messages */

module.exports = {

    friendlyName: 'messages.send',

    description: 'Send out client messages',

    inputs: {
        from: {
            type: 'string',
            required: true,
            description: 'ID of the client sending the message.'
        },
        to: {
            type: 'string',
            required: true,
            description: 'ID of the client to receive the message.'
        },

        to_friendly: {
            type: 'string',
            required: true,
            description: 'Friendly name of the client to receive the message.'
        },

        message: {
            type: 'string',
            required: true,
            description: 'The message.'
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper messages.send called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            
            // Filter profanity
            inputs.message = await sails.helpers.filterProfane(inputs.message);
            sails.log.silly(`Profanity filtered. New messahe: ${inputs.message}`);
            
            // Grab data pertaining to the host that is retrieving messages. Create if not exists.
            var stuff = await Hosts.findOrCreate({host: inputs.from}, {host: inputs.from, friendlyname: inputs.from})
                    .tolerate((err) => {
                        return exits.error(err);
                    });
            sails.log.silly(`Host: ${stuff}`);
            inputs.from_friendly = stuff.friendlyname;
            
            // Create the message
            var records = await Messages.create(inputs).fetch()
                    .tolerate((err) => {
                        return exits.error(err);
                    });
            if (!records)
            {
                return exits.error(new Error('Internal error: Could not save message in database.'));
            } else {
                // Broadcast the message over web sockets
                return exits.success();
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

