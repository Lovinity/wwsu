module.exports = {
  friendlyName: "Post schedule",

  description:
    "Make a discord channel for an event if it does not exist. And post or edit the message for its schedule",

  inputs: {
    event: {
      type: "json",
      required: true
    },
    channel: {
      type: "ref"
    }
  },

  exits: {},

  fn: async function(inputs) {
    // Do not make channels for events that are not a broadcast or are a sports broadcast
    if (
      ["show", "remote", "prerecord", "playlist"].indexOf(inputs.event.type) ===
      -1
    )
      return;

    let channel;
    let message;

    // Get or create the Discord channel for the event
    channel =
      inputs.channel ||
      (await sails.helpers.discord.calendar.makeEventChannel(inputs.event));

    // If the event is discontinued, edit the schedule message
    if (!inputs.event.active) {
      if (inputs.event.discordScheduleMessage && channel) {
        try {
          message = await channel.messages.fetch(
            inputs.event.discordScheduleMessage
          );
        } catch (e) {
          /* Ignore errors */
        }
        if (message) {
          await message.edit(
            ":x: This show was discontinued and is no longer airing on WWSU.",
            { reason: "Event was discontinued" }
          );
        }
        // Set scheduleMessage to null so we don't run this again.
        await sails.models.calendar
          .update(
            { ID: inputs.event.calendarID || inputs.event.ID },
            { discordChannel: channel.id, discordScheduleMessage: null }
          )
          .fetch();
      }
      return;
    }

    // Get all the schedules
    let schedules = await sails.models.schedule.find({
      calendarID: inputs.event.calendarID || inputs.event.ID
    });
    schedules = schedules.filter(schedule => schedule.scheduleType === null);

    // Construct an embed containing the details of the schedules
    let embed = new Discord.MessageEmbed()
      .setColor("#787800")
      .setTitle(
        `:calendar: Time slots for ${inputs.event.hosts} - ${inputs.event.name}`
      )
      .setFooter(
        `This message will be edited automatically when the broadcast's time slots change. This message was pinned to the channel for easy access.`
      );

    // Add the time slots
    if (schedules && schedules.length > 0) {
      schedules.map(schedule => {
        embed = embed.addField(
          `Slot ${schedule.ID}`,
          `${sails.models.calendar.calendardb.generateScheduleText(schedule)}${
            schedule.type ? ` (${schedule.type})` : ``
          }`
        );
      });
    } else {
      embed = embed.setDescription(
        `There are no time slots for this show at this time.`
      );
    }

    // Update existing message if applicable
    if (inputs.event.discordScheduleMessage) {
      try {
        message = await channel.messages.fetch(
          inputs.event.discordScheduleMessage
        );
      } catch (e) {
        /* Ignore errors */
      }
      if (message) {
        message = await message.edit({ embed: embed });
        return message;
      }
    }

    // At this point, message does not exist. Create it.
    message = await channel.send({ embed: embed });
    await message.pin();

    await sails.models.calendar
      .update(
        { ID: inputs.event.calendarID || inputs.event.ID },
        { discordChannel: channel.id, discordScheduleMessage: message.id }
      )
      .fetch();

    return message;
  }
};
