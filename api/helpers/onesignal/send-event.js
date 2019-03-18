/* global Subscribers, sails */

module.exports = {

    friendlyName: 'sails.helpers.onesignal.sendEvent',

    description: 'Send push notifications out for a new show/programming that just went out on the air.',

    inputs: {
        prefix: {
            type: 'string',
            required: true,
            description: `The event prefix that determines the type of event.`
        },

        event: {
            type: `string`,
            required: true,
            description: `The name of the event, without the prefix`
        },

        type: {
            type: 'string',
            required: true,
            description: `The type of event this is, such as a live show, prerecord, or sports broadcast`
        },

        googleUnique: {
            type: `string`,
            allowNull: true,
            description: `The Google Calendar ID of the event that just started, or null if there is no event.`
        },
    },

    fn: async function (inputs, exits) {
        try {
            var devices = [];
            if (inputs.googleUnique && inputs.googleUnique !== null)
            {
                var records = await Subscribers.destroy({type: `calendar-once`, subtype: inputs.googleUnique}).fetch();
                records.map((record) => devices.push(record.device));
            }
            records = await Subscribers.find({type: `calendar-all`, subtype: [inputs.event, `${inputs.prefix}${inputs.event}`]});
            records.map((record) => devices.push(record.device));
            if (devices.length > 0)
                await sails.helpers.onesignal.send(devices, `request`, `WWSU - ${inputs.type} is On the Air!`, `${inputs.event} just started on WWSU Radio!`, (60 * 180));
            
            return exits.success(true);
        } catch (e) {
            // No erroring if there's an error; just ignore it
            sails.log.error(e);
            return exits.success(false);
        }
    }


};

