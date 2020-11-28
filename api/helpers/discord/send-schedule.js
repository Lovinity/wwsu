module.exports = {
  friendlyName: "Send schedule",

  description:
    "Use the schedule webhook to let others know in the Discord that a show schedule was changed.",

  inputs: {
    event: {
      type: "json",
      description: "Event object triggering the notification."
    },
    started: {
      type: "boolean",
      defaultsTo: true,
      description:
        "If true, this is a notification that the event is on the air rather than updated or canceled."
    },
    newSchedule: {
      type: "boolean",
      defaultsTo: false,
      description:
        "If true, event object is a main calendar event with a new regular event.schedule (for informing subscribers that the show has a permanent time change)."
    },
    removedException: {
      type: "boolean",
      defaultsTo: false,
      description:
        "If true, the event object, which is an exception, was removed. For example, reversal of cancelations or updates."
    }
  },

  exits: {
    success: {
      description: "All done."
    }
  },

  fn: async function(inputs) {
    // TODO: move this to config
    const webhook =
      "https://discord.com/api/webhooks/782133995332304976/MOq9tnaFYsT4QVAtKoa77HLUAEopxWCo65t8X9Zg5_5L4N-rDsjORzud_Yn2ddH11xr8";

    if (inputs.started) return;

    if (!inputs.event || ["show", "remote", "sports", "prerecord", "playlist"].indexOf(inputs.event.type) === -1) return;

    if (!inputs.newSchedule && !inputs.removedException) {
      if (
        inputs.event.scheduleType === "updated" ||
        inputs.event.scheduleType === "updated-system"
      )
        return await needle(
          "post",
          webhook,
          {
            username: inputs.event.name,
            content: `:warning: **One-Time Schedule Change** for ${
              inputs.event.type
            }: ${inputs.event.hosts} - ${inputs.event.name}.
Original date/time: ${moment(inputs.event.originalTime).format("LLLL")}
New date/time: **${moment(inputs.event.start).format("LLLL")} - ${moment(
              inputs.event.end
            ).format("LT")}**
Reason for change (if specified): ${inputs.event.scheduleReason}

This re-schedule only applies to the date/time listed above; it does not apply to future time slots.`
          },
          { headers: { "Content-Type": "application/json" } }
        );

      if (
        inputs.event.scheduleType === "canceled" ||
        inputs.event.scheduleType === "canceled-system"
      )
        return await needle(
          "post",
          webhook,
          {
            username: inputs.event.name,
            content: `:no_entry: **Cancellation** for ${inputs.event.type}: ${
              inputs.event.hosts
            } - ${inputs.event.name}.
  Cancelled Date/time: ${moment(inputs.event.originalTime).format("LLLL")}
  Reason (if specified): ${inputs.event.scheduleReason}
  
  This cancellation only applies to the date/time listed above; it does not apply to future time slots.`
          },
          { headers: { "Content-Type": "application/json" } }
        );
    }

    if (!inputs.newSchedule && inputs.removedException) {
      if (
        inputs.event.scheduleType === "updated" ||
        inputs.event.scheduleType === "updated-system"
      )
        return await needle(
          "post",
          webhook,
          {
            username: inputs.event.name,
            content: `:no_entry_sign: :warning: **Re-schedule reversed** for ${
              inputs.event.type
            }: ${inputs.event.hosts} - ${inputs.event.name}.
Rescheduled time: ${moment(inputs.event.start).format("LLLL")} - ${moment(
              inputs.event.end
            ).format("LT")}
Broadcast will now air at its originally scheduled date/time of ${moment(
              inputs.event.originalTime
            ).format("LLLL")}`
          },
          { headers: { "Content-Type": "application/json" } }
        );

      if (
        inputs.event.scheduleType === "canceled" ||
        inputs.event.scheduleType === "canceled-system"
      )
        return await needle(
          "post",
          webhook,
          {
            username: inputs.event.name,
            content: `:no_entry_sign: :no_entry: **Cancellation reversed** for ${
              inputs.event.type
            }: ${inputs.event.hosts} - ${inputs.event.name}.
Cancelled time: ${moment(inputs.event.originalTime).format("LLLL")}
Broadcast will now air at its originally scheduled date/time.`
          },
          { headers: { "Content-Type": "application/json" } }
        );
    }

    if (!inputs.event.active)
      return await needle(
        "post",
        webhook,
        {
          username: inputs.event.name,
          content: `:wastebasket: **Show has been discontinued on WWSU**: ${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}.
        
This show has been removed / discontinued and will no longer air on WWSU Radio.`
        },
        { headers: { "Content-Type": "application/json" } }
      );
  }
};
