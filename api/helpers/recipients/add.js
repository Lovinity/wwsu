/* global sails, Recipients, _, moment, Status, Hosts */

module.exports = {

    friendlyName: 'recipients.add',

    description: 'Called when there is a new recipient.',

    inputs: {

        socket: {
            type: 'string',
            required: true,
            description: 'The socket ID of the recipient.'
        },

        name: {
            type: 'string',
            required: true,
            description: 'The alphanumeric host / name of the recipient.'
        },

        group: {
            type: 'string',
            required: true,
            isIn: ['system', 'website', 'display', 'computers'],
            description: 'The group that the recipient belogs.'
        },

        label: {
            type: 'string',
            required: true,
            description: 'A human friendly name of the recipient'
        }

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Helper recipients.add called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {

            // Determine the status color based off of the group and recipient
            var status = 5;
            switch (inputs.group)
            {
                case 'system':
                    if (inputs.name === 'emergency')
                        status = 1;
                    if (inputs.name === 'requests')
                        status = 4;
                    break;
                case 'website':
                    status = 5;
                    break;
                case 'display':
                case 'computers':
                    status = 2;
                    break;
                default:
                    status = 5;
            }

            sails.log.silly(`Status: ${status}`);

            // If this is a computers recipient, see if it's in the Hosts table. If so, use that as the label instead of the provided label.
            if (inputs.group === 'computers')
            {
                var host = await Hosts.find({host: inputs.name}).limit(1)
                        .intercept((err) => {
                        });
                if (host && typeof host[0] !== 'undefined')
                {
                    inputs.label = host.friendlyname;
                }
            }

            // Get or create the recipient entry
            var recipient = await Recipients.findOrCreate({name: inputs.name}, {name: inputs.name, group: inputs.group, label: inputs.label, status: status, time: moment().toISOString()})
                    .intercept((err) => {
                        return exits.error(err);
                    });

            sails.log.silly(`Recipients record: ${recipient}`);

            // Search to see if any changes are made to the recipient; we only want to update if there is a change.
            var criteria = {name: inputs.name, group: inputs.group, label: inputs.label, status: status};
            var updateIt = false;
            for (var key in criteria)
            {
                if (criteria.hasOwnProperty(key))
                {
                    if (criteria[key] !== recipient[key])
                    {
                        updateIt = true;
                        break;
                    }
                }
            }
            if (updateIt)
            {
                sails.log.verbose(`Updating recipient as it has changed.`);
                await Recipients.update({name: inputs.name}, {name: inputs.name, group: inputs.group, label: inputs.label, status: status, time: moment().toISOString()})
                        .intercept((err) => {
                            return exits.error(err);
                        });
            }

            // If the recipient group is computers, update Status
            if (inputs.group === 'computers')
            {
                var inConfig = false;
                await sails.helpers.asyncForEach(sails.config.custom.djcontrols, function (djcontrols, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (djcontrols.host === inputs.name)
                            {
                                inConfig = true;
                                await Status.changeStatus([{name: `djcontrols-${djcontrols.name}`, label: `DJ Controls ${djcontrols.label}`, status: 5, data: 'This DJ Controls is reporting operational.'}]);
                                return resolve(true);
                            } else {
                                return resolve(false);
                            }
                        } catch (e) {
                            return reject(e);
                        }
                    });
                });

                if (!inConfig)
                    await Status.changeStatus([{name: `djcontrols-${inputs.name}`, label: `DJ Controls ${inputs.label}`, status: 5, data: 'This DJ Controls is reporting operational.'}]);
            }

            // If the recipient group is display, update Status
            if (inputs.group === 'display')
            {
                var inConfig = false;
                await sails.helpers.asyncForEach(sails.config.custom.displaysigns, function (display, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (inputs.name === `display-${display.name}`)
                            {
                                inConfig = true;
                                await Status.changeStatus([{name: `display-${display.name}`, label: `Display ${display.label}`, status: 5, data: 'This display sign is reporting operational.'}]);
                                return resolve(true);
                            } else {
                                return resolve(false);
                            }
                        } catch (e) {
                            return reject(e);
                        }
                    });
                });

                if (!inConfig)
                    await Status.changeStatus([{name: inputs.name, label: inputs.label, status: 5, data: 'This display sign is reporting operational.'}]);
            }

            // Put the socket ID in memory
            if (typeof Recipients.sockets[recipient.ID] === 'undefined')
                Recipients.sockets[recipient.ID] = [];

            if (!_.includes(Recipients.sockets[recipient.ID], inputs.socket))
            {
                Recipients.sockets[recipient.ID].push(inputs.socket);
            }

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};

