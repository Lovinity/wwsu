/* global sails, Subscribers, Logs, needle */

module.exports = {

    friendlyName: 'sails.helpers.onesignal.send',

    description: 'Send a notification out to onesignal player devices.',

    inputs: {
        devices: {
            type: 'ref',
            required: true,
            description: `A list of OneSignal IDs to send this notification to.`
        },
        category: {
            type: 'string',
            isIn: ["message", "event", "announcement", "request"],
            required: true,
            description: `The category of the notification.`
        },
        title: {
            type: 'string',
            required: true,
            description: `The title of the notification`
        },
        content: {
            type: 'string',
            required: true,
            description: `The content of the notification`
        },
        ttl: {
            type: `number`,
            defaultsTo: (60 * 60 * 24),
            description: `The amount of time the notification persists for mobile users.`
        }
    },

    fn: async function (inputs, exits) {
        try {
            // TODO: add configuration for this
            var categories = {
                "message": "6d890066-6cc0-4b12-84ef-4a15a9220b1e",
                "event": "6d890066-6cc0-4b12-84ef-4a15a9220b1e",
                "announcement": "6d890066-6cc0-4b12-84ef-4a15a9220b1e",
                "request": "0aa0e762-ca89-4eef-89a2-82009a58cb1a"
            };
            needle('post', `https://onesignal.com/api/v1/notifications`, {
                app_id: `150c0123-e224-4e5b-a8b2-fc202d78e2f1`,
                include_player_ids: inputs.devices,
                headings: {"en": inputs.title},
                contents: {"en": inputs.content},
                url: `https://server.wwsu1069.org/listen`,
                android_channel_id: categories[inputs.category],
                android_group: categories[inputs.category],
                android_group_message: `$[notif_count] new ${inputs.category}s`,
                thread_id: categories[inputs.category],
                summary_arg: `${inputs.category}s`,
                ttl: inputs.ttl,
            }, {headers: {'Content-Type': 'application/json', 'Authorization': `Basic ${sails.config.custom.onesignal.rest}`}})
                    .then(async function (resp) {
                        if (typeof resp.body.errors !== `undefined`)
                        {
                            if (typeof resp.body.errors["invalid_player_ids"] !== `undefined`)
                            {
                                resp.body.errors["invalid_player_ids"].map((invalid) => {
                                    (async(invalid2) => {
                                        await Subscribers.destroy({device: invalid2});
                                        await Logs.create({attendanceID: null, logtype: 'subscribers', loglevel: 'info', logsubtype: 'inactive', event: `<strong>An inactive subscriber was removed from the system.</strong><br />Device: ${invalid2}`}).fetch()
                                                .tolerate((err) => {
                                                    // Don't throw errors, but log them
                                                    sails.log.error(err);
                                                });
                                    })(invalid);
                                })
                            } else if (resp.body.errors.indexOf("All included players are not subscribed") !== -1)
                            {
                                inputs.devices.map((invalid) => {
                                    (async(invalid2) => {
                                        await Subscribers.destroy({device: invalid2});
                                        await Logs.create({attendanceID: null, logtype: 'subscribers', loglevel: 'info', logsubtype: 'inactive', event: `<strong>An inactive subscriber was removed from the system.</strong><br />Device: ${invalid2}`}).fetch()
                                                .tolerate((err) => {
                                                    // Don't throw errors, but log them
                                                    sails.log.error(err);
                                                });
                                    })(invalid);
                                })
                            }
                        }
                        return exits.success(true);
                    });

        } catch (e) {
            // Do not error when notifications fail, but return false instead.
            sails.log.error(e);
            return exits.success(false);
        }
    }


};

