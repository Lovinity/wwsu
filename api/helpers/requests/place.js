/* global sails, Songs, Requests, moment */

module.exports = {

    friendlyName: 'requests.place',

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
        sails.log.debug('Helper requests.place called.');
        sails.log.silly(`Parameters passed: ${inputs}`);
        try {
            // First, confirm the track can actually be requested.
            var requestable = await sails.helpers.requests.checkRequestable(inputs.ID, inputs.IP);

            // If so, do stuff
            if (requestable.requestable)
            {

                // Get the song data
                var record2 = await Songs.findOne({ID: inputs.ID})
                        .tolerate((err) => {
                            return exits.error(err);
                        });
                        sails.log.silly(`Song: ${record2}`);

                // Create the request
                await Requests.create({songID: inputs.ID, username: inputs.name, userIP: inputs.IP, message: inputs.message, requested: moment().toISOString(), played: 0})
                        .tolerate((err) => {
                            return exits.error(err);
                        });
                Requests.pending.push(inputs.ID);

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

