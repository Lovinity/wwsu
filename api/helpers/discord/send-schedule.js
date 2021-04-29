module.exports = {
  friendlyName: "Send schedule",

  description:
    "Use the schedule webhook to let others know in the Discord that a show schedule was changed.",

  inputs: {
    event: {
      type: "json",
      description: "Calendar event object triggering the notification.",
    },
    record: {
      type: "json",
      description: "The schedule database record triggering this notification",
    },
    started: {
      type: "boolean",
      defaultsTo: true,
      description:
        "If true, this is a notification that the event is on the air rather than updated or canceled.",
    },
    newSchedule: {
      type: "boolean",
      defaultsTo: false,
      description:
        "If true, event object is a main calendar event with a new regular event.schedule (for informing subscribers that the show has a permanent time change).",
    },
    removedException: {
      type: "boolean",
      defaultsTo: false,
      description:
        "If true, the event object, which is an exception, was removed. For example, reversal of cancelations or updates.",
    },
    removedSchedule: {
      type: "boolean",
      defaultsTo: false,
      description:
        "If true, the event object, which is a main schedule, was removed.",
    },
  },

  exits: {
    success: {
      description: "All done.",
    },
  },

  fn: async function (inputs) {
    // If this is an event that is on the air now, skip.
    if (inputs.started) return;

    // Skip all events that are not a broadcast
    if (
      !inputs.event ||
      ["show", "remote", "sports", "prerecord", "playlist"].indexOf(
        inputs.event.type
      ) === -1
    )
      return;

    // Prep discord
    let embed = new Discord.MessageEmbed();
    if (inputs.event.banner)
      embed = embed.setImage(
        `https://server.wwsu1069.org/uploads/calendar/banner/${inputs.event.banner}`
      );
    if (inputs.event.logo)
      embed = embed.setThumbnail(
        `https://server.wwsu1069.org/uploads/calendar/logo/${inputs.event.logo}`
      );
    let channel = DiscordClient.channels.resolve(
      sails.config.custom.discord.channels.scheduleChanges
    );
    let channel2;

    // Get and send the same message in the show channel if it exists
    if (inputs.event.discordChannel) {
      channel2 = DiscordClient.channels.resolve(inputs.event.discordChannel);
    }

    if (!inputs.event.active) {
      embed = embed
        .setTitle(
          `:no_entry_sign: ${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name} has been discontinued`
        )
        .setColor("#000000")
        .setFooter(`This show will no longer air on WWSU 106.9 FM`);

      if (channel) await channel.send({ embed: embed });
      if (channel2) await channel2.send({ embed: embed });

      // Make sure
      await sails.models.calendar.update(
        { ID: inputs.event.calendarID || inputs.event.ID },
        { discordScheduleMessage: null }
      );

      return;
    }

    if (!inputs.newSchedule && !inputs.removedException) {
      if (
        inputs.event.scheduleType === "updated" ||
        inputs.event.scheduleType === "updated-system"
      ) {
        embed = embed
          .setTitle(
            `:warning: ${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name} was re-scheduled`
          )
          .setColor("#ffff00")
          .setDescription(inputs.event.scheduleReason || "Unknown reason")
          .addField(
            "Original Date / Time",
            `${moment(inputs.event.originalTime).format("LLLL")}`
          )
          .addField(
            "New Date / Time",
            `${moment(inputs.event.start).format("LLLL")} - ${moment(
              inputs.event.end
            ).format("LT")}`
          )
          .setFooter(
            `This re-schedule only applies to the date/time listed; it does not apply to future time slots.`
          );

        if (channel) await channel.send({ embed: embed });
        if (channel2) await channel2.send({ embed: embed });

        return;
      }

      if (
        inputs.event.scheduleType === "canceled" ||
        inputs.event.scheduleType === "canceled-system"
      ) {
        embed = embed
          .setTitle(
            `:no_entry: ${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name} was canceled`
          )
          .setColor("#ff0000")
          .setDescription(inputs.event.scheduleReason || "Unknown reason")
          .addField(
            "Canceled Date / Time",
            `${moment(inputs.event.originalTime).format("LLLL")}`
          )
          .setFooter(
            `This cancellation only applies to the date/time listed; it does not apply to future time slots.`
          );

        if (channel) await channel.send({ embed: embed });
        if (channel2) await channel2.send({ embed: embed });

        return;
      }
    }

    if (!inputs.newSchedule && inputs.removedException) {
      if (
        inputs.event.scheduleType === "updated" ||
        inputs.event.scheduleType === "updated-system"
      ) {
        embed = embed
          .setTitle(
            `:warning: :wastebasket: ${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name} re-schedule was reversed`
          )
          .setColor("#0000ff")
          .addField(
            "Originally re-scheduled Date / Time",
            `${moment(inputs.event.start).format("LLLL")} - ${moment(
              inputs.event.end
            ).format("LT")}`
          )
          .addField(
            "Will Now Air at This Date / Time",
            `${moment(inputs.event.originalTime).format("LLLL")}`
          );

        if (channel) await channel.send({ embed: embed });
        if (channel2) await channel2.send({ embed: embed });

        return;
      }

      if (
        inputs.event.scheduleType === "canceled" ||
        inputs.event.scheduleType === "canceled-system"
      ) {
        embed = embed
          .setTitle(
            `:no_entry: :wastebasket: ${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name} cancellation was reversed`
          )
          .setColor("#0000ff")
          .addField(
            "Originally Canceled Date / Time",
            `${moment(inputs.event.originalTime).format("LLLL")}`
          )
          .setFooter(`Broadcast will now air at the specified time above.`);

        if (channel) await channel.send({ embed: embed });
        if (channel2) await channel2.send({ embed: embed });

        return;
      }
    }

    if (inputs.removedSchedule) {
      embed = embed
        .setTitle(
          `:calendar: :wastebasket: A time slot for ${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name} was removed`
        )
        .setColor("#ff0000")
        .addField(
          "Removed Time Slot",
          `${sails.models.calendar.calendardb.generateScheduleText(
            inputs.record
          )}`
        )
        .setFooter(`This show will no longer air on WWSU at the specified time slot`);

      if (channel) await channel.send({ embed: embed });
      if (channel2) await channel2.send({ embed: embed });

      return;
    }

    if (inputs.newSchedule) {
      embed = embed
        .setTitle(
          `:calendar: A time slot for ${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name} was added`
        )
        .setColor("#00ff00")
        .addField(
          "New Time Slot",
          `${sails.models.calendar.calendardb.generateScheduleText(
            inputs.record
          )}`
        );

      if (channel) await channel.send({ embed: embed });
      if (channel2) await channel2.send({ embed: embed });

      return;
    }

    return;
  },
};
