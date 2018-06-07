/* global sails, Recipients, _, moment, Status */

module.exports = {

    friendlyName: 'recipients.remove',

    description: 'Remove a recipient socket from memory, and set recipient to offline if no sockets no longer active. Certain recipients should be actually removed after one hour of offline via cron.',

    inputs: {
        socket: {
            type: 'string',
            required: true,
            description: 'The socket ID of the recipient that was removed / disconnected.'
        },

        host: {
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
            if (typeof inputs.host === 'undefined' || inputs.host === null)
            {
                sails.log.verbose(`No host specified. Trying to find recipient ID instead.`);
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
                where.host = inputs.host;
            }

            // If we could not find the recipient, exit the helper.
            if (typeof where.ID === 'undefined' && typeof where.host === 'undefined')
            {
                sails.log.verbose(`Could not find recipient. Assuming they do not exist. Terminating helper.`);
                return exits.success();
            }

            // Get the recipient entry
            var recipient = await Recipients.findOne(where)
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
                    await Recipients.update({host: inputs.host}, {host: inputs.host, status: 0, time: moment().toISOString()})
                            .intercept((err) => {
                                return exits.error(err);
                            });

                    // If the recipient name is found in djcontrols config, reflect status
                    await sails.helpers.asyncForEach(sails.config.custom.djcontrols, function (djcontrols, index) {
                        return new Promise(async (resolve, reject) => {
                            try {
                                if (djcontrols.host === inputs.host)
                                    await Status.changeStatus([{name: `djcontrols-${djcontrols.name}`, label: `DJ Controls ${djcontrols.label}`, status: 3, data: 'This DJ Controls is reporting offline.'}]);
                                return resolve(true);
                            } catch (e) {
                                return reject(e);
                            }
                        });
                    });
                    
                    // If the recipient name is found in display sign config, reflect status
                    await sails.helpers.asyncForEach(sails.config.custom.displaysigns, function (display, index) {
                        return new Promise(async (resolve, reject) => {
                            try {
                                if (inputs.host === `display-${display.name}`)
                                    await Status.changeStatus([{name: `display-${display.name}`, label: `Display ${display.label}`, status: 3, data: 'This display sign is reporting offline.'}]);
                                return resolve(true);
                            } catch (e) {
                                return reject(e);
                            }
                        });
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

