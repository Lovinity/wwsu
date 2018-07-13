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

        host: {
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
                var host = await Hosts.find({host: inputs.host}).limit(1)
                        .tolerate((err) => {
                            sails.log.error(err);
                        });
                if (host && typeof host[0] !== 'undefined')
                {
                    inputs.label = host[0].friendlyname;
                }
            }

            // Get or create the recipient entry
            var recipient = await Recipients.findOrCreate({host: inputs.host}, {host: inputs.host, group: inputs.group, label: inputs.label, status: status, time: moment().toISOString(true)});

            sails.log.silly(`Recipients record: ${recipient}`);

            // Search to see if any changes are made to the recipient; we only want to update if there is a change.
            var criteria = {host: inputs.host, group: inputs.group, status: status};
            var updateIt = false;
            for (var key in criteria)
            {
                if (criteria.hasOwnProperty(key))
                {
                    if (criteria[key] !== recipient[key])
                    {
                        // Do not update label changes. This should be done via recipients/edit or recipients/edit-web.
                        if (key !== 'label')
                        {
                            updateIt = true;
                            break;
                        }
                    }
                }
            }
            if (updateIt)
            {
                sails.log.verbose(`Updating recipient as it has changed.`);
                await Recipients.update({host: inputs.host}, {host: inputs.host, group: inputs.group, status: status, time: moment().toISOString(true)}).fetch();
            }

            // If the recipient group is computers, update Status
            if (inputs.group === 'computers')
            {
                var inConfig = false;
                await sails.helpers.asyncForEach(sails.config.custom.djcontrols, function (djcontrols, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (djcontrols.host === inputs.host)
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
            }

            // If the recipient group is display, update Status
            if (inputs.group === 'display')
            {
                var inConfig = false;
                await sails.helpers.asyncForEach(sails.config.custom.displaysigns, function (display, index) {
                    return new Promise(async (resolve, reject) => {
                        try {
                            if (inputs.host === `display-${display.name}`)
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
            }

            // Put the socket ID in memory
            if (typeof Recipients.sockets[recipient.ID] === 'undefined')
                Recipients.sockets[recipient.ID] = [];

            // Make sure we do not add the same socket more than once
            if (!_.includes(Recipients.sockets[recipient.ID], inputs.socket))
            {
                Recipients.sockets[recipient.ID].push(inputs.socket);
            }

            return exits.success(recipient.label);
        } catch (e) {
            return exits.error(e);
        }

    }


};

