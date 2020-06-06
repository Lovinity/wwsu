module.exports = {

  friendlyName: 'sails.helpers.email.queueEvent',

  description: 'Queue emails for shows / programs that have started or have been changed.',

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
      var to = [];
      var cc = [];
      var records

      // No notifications for empty events
      if (!inputs.event || inputs.event === null)
        return exits.success(false);

      // Load in DJs to send to
      var maps = [ 'hostDJ', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map(async (key) => {
        if (!inputs.event[ key ]) return;

        var query = {};

        var dj = await sails.models.djs.findOne({ ID: inputs.event[ key ], email: { '!=': null } });
        if (dj) {
          to.push(dj.email);
        }
      });
      await Promise.all(maps);

      // Load in directors to be CCd
      var records = await sails.models.directors.find({ emailDJs: true, email: { '!=': null } });
      cc = records.map((record) => record.email);

      if (inputs.started) {
        // Do nothing
      } else if (!inputs.newSchedule && !inputs.removedException) {
        // Changed date/time
        if (inputs.event.scheduleType === 'updated' || inputs.event.scheduleType === 'updated-system') {
          await sails.helpers.emails.queue(
            to,
            cc,
            `Changed date/time for ${inputs.event.hosts} - ${inputs.event.name}`,
            `Dear ${inputs.event.hosts},<br /><br />

  A time slot for your show, <strong>${inputs.event.name}</strong>, was <strong>re-scheduled</strong>.<br /><br />

  Original time: ${moment(inputs.event.originalTime).format("LLLL")}<br />
  New time: <strong>${moment(inputs.event.start).format("LLLL")} - ${moment(inputs.event.end).format("LT")}</strong><br /><br />
  
  Reason for change (if specified): ${inputs.event.scheduleReason}<br /><br />

  This re-schedule only applies to the date/time listed above; it does not apply to future time slots.<br /><br />
  
  If you have any questions or concerns, please contact a director.`
          );

          // Canceled date/time
        } else if (inputs.event.scheduleType === 'canceled' || inputs.event.scheduleType === 'canceled-system') {
          await sails.helpers.emails.queue(
            to,
            cc,
            `Canceled date/time for ${inputs.event.hosts} - ${inputs.event.name}`,
            `Dear ${inputs.event.hosts},<br /><br />

  A time slot for your show, <strong>${inputs.event.name}</strong>, was <strong>canceled</strong>.<br /><br />

  Canceled time: ${moment(inputs.event.originalTime).format("LLLL")}<br />
  
  Reason for cancellation (if specified): ${inputs.event.scheduleReason}<br /><br />

  This cancellation only applies to the date/time listed above; it does not apply to future time slots.<br /><br />
  
  If you have any questions or concerns, please contact a director.`
          );
        }


      } else if (!inputs.newSchedule && inputs.removedException) {

        // reversed Changed date/time
        if (inputs.event.scheduleType === 'updated' || inputs.event.scheduleType === 'updated-system') {
          await sails.helpers.emails.queue(
            to,
            cc,
            `Reversal of a re-schedule for ${inputs.event.hosts} - ${inputs.event.name}`,
            `Dear ${inputs.event.hosts},<br /><br />

  Your show, <strong>${inputs.event.name}</strong>, was originally re-scheduled to a different time. However, that re-schedule was reversed and your show is now scheduled for its <strong>original time</strong>.<br /><br />

  Rescheduled time: ${moment(inputs.event.start).format("LLLL")} - ${moment(inputs.event.end).format("LT")}<br />
  <strong>The show should now air on its originally scheduled time slot and duration of ${moment(inputs.event.originalTime).format("LLLL")}.</strong>
  
  If you have any questions or concerns, please contact a director.`
          );

          // reversed Canceled date/time
        } else if (inputs.event.scheduleType === 'canceled' || inputs.event.scheduleType === 'canceled-system') {
          await sails.helpers.emails.queue(
            to,
            cc,
            `Reversal of cancellation for ${inputs.event.hosts} - ${inputs.event.name}`,
            `Dear ${inputs.event.hosts},<br /><br />

  Your show, <strong>${inputs.event.name}</strong>, was originally canceled on a date/time. However, that cancellation was reversed and your show is now scheduled for its <strong>original time</strong>.<br /><br />

  <strong>The show should now air on its originally scheduled time slot and duration of ${moment(inputs.event.originalTime).format("LLLL")}; the cancellation of this date/time was reversed.</strong>
  
  If you have any questions or concerns, please contact a director.`
          );
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
