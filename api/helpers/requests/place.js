/* global sails, Songs, Requests */

var moment = require("moment");

module.exports = {

    friendlyName: 'Requests / Place',

    description: 'Place a request.',

    inputs: {
        ID: {
            type: 'number',
            required: true,
            description: 'The ID of the song being requested.'
        },
        IP: {
            type: 'string',
            required: true,
            description: 'IP address of the client making the request.'
        },
        name: {
            type: 'string',
            defaultsTo: 'Anonymous',
            description: 'Name of the person making the request.'
        },
        message: {
            type: 'string',
            defaultsTo: '',
            description: 'A message to be included with the request.'
        }
    },

    fn: async function (inputs, exits) {
        try {
            // First, confirm the track can actually be requested.
            var requestable = await sails.helpers.requests.checkRequestable(inputs.ID, inputs.IP);

            // If so, do stuff
            if (requestable.requestable)
            {

                // Get the song data
                var record2 = await Songs.findOne({ID: inputs.ID})
                        .intercept((err) => {
                            return exits.error(err);
                        });

                // Create the request
                var record = await Requests.create({songID: inputs.ID, username: inputs.name, userIP: inputs.IP, message: inputs.message, requested: moment().toISOString(), played: 0})
                        .intercept((err) => {
                            return exits.error(err);
                        });
                Requests.pending.push(inputs.ID);

                // Push the request through websockets
                var temp = record;
                if (record2)
                    temp.trackname = `${record2.artist} - ${record2.title}`;

                // Update the Track Requests recipient to light up, showing a pending request is in queue.
                var temp2 = {};
                temp2['system'] = {};
                temp2['system']['trackrequests'] = {label: 'Track Requests', status: 4};

                // Finish it
                return exits.success({requested: true, HTML: `<div class="alert alert-success" role="alert">
                                            Request placed! In automation, requests are queued every :20, :40, and :00 past the hour. If a show is live, it is up to the host's discretion of when/if to play requests.
                                            </div>`});
                // If it cannot be requested, respond with the errors of why it cannot be requested.
            } else {
                return exits.success({requested: false, HTML: requestable.HTML});
            }
        } catch (e) {
            return exits.error(e);
        }
    }


};

