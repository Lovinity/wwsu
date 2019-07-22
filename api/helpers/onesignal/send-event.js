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

    date: {
      type: 'string',
      description: `If specified, this notification is a cancellation notice, and this is the date which the event was cancelled for.`
    },

    cancelled: {
      type: 'boolean',
      description: 'If true, and date was provided, consider event as cancelled. If false and date provided, consider event as changed date/time.'
    }
  },

  fn: async function (inputs, exits) {
    try {
      var devices = []

      // Find and destroy any subscriptions based on single occurrence.
      if (inputs.googleUnique && inputs.googleUnique !== null) {
        var records = await sails.models.subscribers.destroy({ type: `calendar-once`, subtype: inputs.googleUnique }).fetch()
        records.map((record) => devices.push(record.device))
      }

      // Find any recurring subscriptions to the event.
      records = await sails.models.subscribers.find({ type: `calendar-all`, subtype: [inputs.event, `${inputs.prefix}${inputs.event}`] })
      records.map((record) => devices.push(record.device))

      // If we have at least 1 person to receive a push notification, continue
      if (devices.length > 0) {
        // If date was not specified, this push notification is for a show that went on the air.
        if (!inputs.date) {
          await sails.helpers.onesignal.send(devices, `event`, `WWSU - ${inputs.type} is On the Air!`, `${inputs.event} just started on WWSU Radio!`, (60 * 60 * 3))
        } else {
          // If date specified and cancelled is false, this push notification is to inform subscribers that an event changed date/time
          if (!inputs.cancelled) {
            await sails.helpers.onesignal.send(devices, `event`, `WWSU - ${inputs.type} changed the date/time.`, `The date/time for ${inputs.event} was changed to ${inputs.date}.`, (60 * 60 * 24 * 7))
            // If date specified and cancelled is true, this push notification is to inform subscribers the event was cancelled.
          } else {
            await sails.helpers.onesignal.send(devices, `event`, `WWSU - ${inputs.type} was cancelled.`, `${inputs.event} was cancelled for the date of ${inputs.date}.`, (60 * 60 * 24 * 7))
          }
        }
      }

      return exits.success(true)
    } catch (e) {
      // No erroring if there's an error; just ignore it
      sails.log.error(e)
      return exits.success(false)
    }
  }

}
