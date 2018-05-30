/* global sails, Recipients, _, moment */

module.exports = {

    friendlyName: 'recipients.remove',

    description: 'Remove a recipient socket from memory, and set recipient to offline if no sockets no longer active. Certain recipients should be actually removed after one hour of offline via cron.',

    inputs: {
        socket: {
            type: 'string',
            required: true,
            description: 'The socket ID of the recipient that was removed / disconnected.'
        },

        name: {
            type: 'string',
            description: 'The alphanumeric host / name of the recipient.',
            allowNull: true
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper recipients.remove called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        var where = {};
        try {

            // No host name? Try to find it based on provided socket.
            if (typeof inputs.name === 'undefined' || inputs.name === null)
            {
                sails.log.verbose(`No name specified. Trying to find recipient ID instead.`);
                for (var key in Recipients.sockets)
                {
                    if (Recipients.sockets.hasOwnProperty(key))
                    {
                        if (_.includes(Recipients.sockets[key], inputs.socket))
                        {
                            where.ID = key;
                            sails.log.verbose(`ID found: ${key}.`);
                            break;
                        }
                    }
                }
            } else {
                where.name = inputs.name;
            }

            // If we could not find the recipient, exit the helper.
            if (typeof where.ID === 'undefined' && typeof where.name === 'undefined')
            {
                sails.log.verbose(`Could not find recipient. Assuming they do not exist. Terminating helper.`);
                return exits.success();
            }

            // Get the recipient entry
            var recipient = await Recipients.findOne(where, {name: inputs.name, group: inputs.group, label: inputs.label, status: status, time: moment().toISOString()})
                    .intercept((err) => {
                        return exits.error(err);
                    });

            sails.log.silly(`Recipients record: ${recipient}`);

            if (typeof recipient !== 'undefined' && typeof Recipients.sockets[recipient.ID] === 'undefined')
            {
                // Remove the socket ID from the array of sockets in memory
                _.remove(Recipients.sockets[recipient.ID], function (e) {
                    return e === inputs.socket;
                });

                // If there are no socket IDs left, that means the recipient is offline. Update accordingly.
                if (Recipients.sockets[recipient.ID].length <= 0)
                {
                    sails.log.verbose(`Recipient is no longer connected. Setting to offline.`);
                    await Recipients.update({name: inputs.name}, {name: inputs.name, status: 0, time: moment().toISOString()})
                            .intercept((err) => {
                                return exits.error(err);
                            });
                }
            }

            return exits.success();

        } catch (e) {
            return exits.error(e);
        }

        // All done.
        return exits.success();

    }


};

