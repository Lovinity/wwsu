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
        sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
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
                    .tolerate((err) => {
                        sails.log.error(err);
                    });

            sails.log.silly(`Recipients record: ${recipient}`);

            if (typeof recipient !== 'undefined' && typeof Recipients.sockets[recipient.ID] !== 'undefined')
            {

                // Remove the socket ID from the array of sockets in memory
                _.remove(Recipients.sockets[recipient.ID], function (e) {
                    return e === inputs.socket;
                });

                // If there are no socket IDs left, that means the recipient is offline. Update accordingly.
                if (Recipients.sockets[recipient.ID].length <= 0)
                {
                    sails.log.verbose(`Recipient is no longer connected. Setting to offline.`);
                    await Recipients.update({host: recipient.host}, {host: recipient.host, status: 0, time: moment().toISOString(true)}).fetch();

                    var maps = sails.config.custom.djcontrols
                            .filter(djcontrols => djcontrols.host === recipient.host)
                            .map(async djcontrols => {
                                await Status.changeStatus([{name: `djcontrols-${djcontrols.name}`, label: `DJ Controls ${djcontrols.label}`, status: djcontrols.level, data: 'DJ Controls is offline.'}]);
                                return true;
                            });
                    await Promise.all(maps);
                }

                // If the recipient name is found in display sign config, reflect status if there are insufficient number of connections.
                var maps = sails.config.custom.displaysigns
                        .filter(display => recipient.host === `display-${display.name}` && Recipients.sockets[recipient.ID].length < display.instances)
                        .map(async display => {
                            await Status.changeStatus([{name: `display-${display.name}`, label: `Display ${display.label}`, status: display.level, data: `${Recipients.sockets[recipient.ID].length} out of ${display.instances} displays are operational.`}]);
                            return true;
                        });
                await Promise.all(maps);
            } else {
                sails.log.verbose(`Recipient not found in database. Assuming already removed.`);
            }

            return exits.success();

        } catch (e) {
            return exits.error(e);
        }

    }
};

