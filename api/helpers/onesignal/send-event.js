module.exports = {

  friendlyName: 'sails.helpers.onesignal.sendEvent',

  description: 'Send push notifications out for shows / programs that have started or have been changed.',

  inputs: {
    event: {
      type: 'json',
      description: 'Event object triggering the notification. Should be the event exception when updating or canceling.'
    },
    started: {
      type: 'boolean',
      defaultsTo: true,
      description: 'If true, this is a notification that the event is on the air rather than updated or canceled.'
    },
    newSchedule: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, event object is a main calendar event with a new regular event.schedule (for informing subscribers that the show has a permanent time change).'
    },
    removedException: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, the event object, which is an exception, was removed. For example, reversal of cancelations or updates.'
    }
  },

  fn: async function (inputs, exits) {
    try {
      var devices = []
      var records

      // No notifications for empty events
      if (!inputs.event || inputs.event === null)
        return exits.success(false);

      // Load in any one-time subscribers to this show
      if (inputs.event.unique) {
        var records = await sails.models.subscribers.find({ type: `calendar-once`, subtype: inputs.event.unique });
        records.map((record) => devices.push(record.device))
      }

      // Load in any recurring subscriptions to the event.
      records = await sails.models.subscribers.find({ type: `calendar-all`, subtype: inputs.event.calendarID });
      records.map((record) => devices.push(record.device))

      if (inputs.started) {
        await sails.helpers.onesignal.send(devices, `event`, `${inputs.event.hosts} - ${inputs.event.name} on the air!`, `${inputs.event.hosts} - ${inputs.event.name} just started on WWSU Radio!`, (60 * 60 * 3))
        // Remove one-time subscriptions
        if (inputs.event.unique)
          await sails.models.subscribers.destroy({ type: `calendar-once`, subtype: inputs.event.unique }).fetch()
      } else if (!inputs.newSchedule && !inputs.removedException) {
        // Changed date/time
        if (inputs.event.exceptionType === 'updated' || inputs.event.exceptionType === 'updated-system') {
          await sails.helpers.onesignal.send(devices, `event`, `${inputs.event.hosts} - ${inputs.event.name} changed one of their show times`, `${inputs.event.hosts} - ${inputs.event.name} has changed their ${moment(inputs.event.exceptionTime).format("llll")} show to ${moment(inputs.event.start).format("llll")}`, (60 * 60 * 24 * 7))
          // Canceled date/time
        } else if (inputs.event.exceptionType === 'canceled' || inputs.event.exceptionType === 'canceled-system') {
          await sails.helpers.onesignal.send(devices, `event`, `${inputs.event.hosts} - ${inputs.event.name} cancelled one of their show times`, `${inputs.event.hosts} - ${inputs.event.name} was cancelled for ${moment(inputs.event.exceptionTime).format("llll")}.`, (60 * 60 * 24 * 7))
        }
      } else if (!inputs.newSchedule && inputs.removedException) {
        // reversed Changed date/time
        if (inputs.event.exceptionType === 'updated' || inputs.event.exceptionType === 'updated-system') {
          await sails.helpers.onesignal.send(devices, `event`, `${inputs.event.hosts} - ${inputs.event.name} reversed a previously changed show time`, `${inputs.event.hosts} - ${inputs.event.name} had an updated show time of ${moment(inputs.event.start).format("llll")}. This was changed back to the original time of ${moment(inputs.event.exceptionTime).format("llll")}.`, (60 * 60 * 24 * 7))
          // reversed Canceled date/time
        } else if (inputs.event.exceptionType === 'canceled' || inputs.event.exceptionType === 'canceled-system') {
          await sails.helpers.onesignal.send(devices, `event`, `${inputs.event.hosts} - ${inputs.event.name} reversed a cancellation`, `${inputs.event.hosts} - ${inputs.event.name} has un-canceled their show for ${moment(inputs.event.exceptionTime).format("llll")}; it will now air at that time.`, (60 * 60 * 24 * 7))
        }
      } else {
        if (inputs.event.active) {
          await sails.helpers.onesignal.send(devices, `event`, `${inputs.event.hosts} - ${inputs.event.name} has changed!`, `${inputs.event.hosts} - ${inputs.event.name} has changed details about the show, possibly including a new permanent show time. Please go to wwsu1069.org for more information.`, (60 * 60 * 24 * 7))
        } else {
          await sails.helpers.onesignal.send(devices, `event`, `${inputs.event.hosts} - ${inputs.event.name} will no longer air on WWSU`, `${inputs.event.hosts} - ${inputs.event.name} has been discontinued on WWSU Radio. We have removed your subscriptions to this show automatically.`, (60 * 60 * 24 * 7))
          // Remove both recurring and one-time subscribers
          await sails.models.subscribers.destroy({ type: `calendar-all`, subtype: inputs.event.calendarID }).fetch();
          await sails.models.subscribers.destroy({ type: `calendar-once`, subtype: { startsWith: `${inputs.event.calendarID}-` } }).fetch();
        }
      }

      return exits.success(true)
    } catch (e) {
      // No erroring if there's an error; just log it and return false to indicate it was not successful
      sails.log.error(e)
      return exits.success(false)
    }
  }

}
