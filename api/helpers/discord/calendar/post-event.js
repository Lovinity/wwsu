module.exports = {
  friendlyName: "Post event",

  description:
    "Make a discord channel for an event if it does not exist. And post or edit the message for its info / description",

  inputs: {
    event: {
      type: "json",
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs) {
    // Do not make channels for events that are not a broadcast or are a sports broadcast
    if (
      ["show", "remote", "prerecord", "playlist"].indexOf(inputs.event.type) ===
      -1
    )
      return;

    let channel;
    let message;

    // Get or create the Discord channel for the event
    channel = await sails.helpers.discord.calendar.makeEventChannel(
      inputs.event
    );

    // Construct an embed containing the details of the event
    let embed = new Discord.MessageEmbed()
      .setColor(sails.models.calendar.calendardb.getColor(inputs.event))
      .setTitle(
        `${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name}`
      )
      .setDescription(inputs.event.description)
      .setFooter(`Read this channel for the show's schedule and updates`);
    if (inputs.event.banner)
      embed = embed.setImage(
        `https://server.wwsu1069.org/uploads/calendar/banner/${inputs.event.banner}`
      );
    if (inputs.event.logo)
      embed = embed.setThumbnail(
        `https://server.wwsu1069.org/uploads/calendar/logo/${inputs.event.logo}`
      );

    // Update existing message if applicable
    if (inputs.event.discordCalendarMessage) {
      try {
        message = await channel.messages.fetch(
          inputs.event.discordCalendarMessage
        );
      } catch (e) {
        /* Ignore errors */
      }
      if (message) {
        message = await message.edit({ embed: embed });
        return message;
      }
    }

    // At this point, message does not exist. Create it if the event is active.
    message = await channel.send({ embed: embed });
    message = await message.pin();

    // API note: do NOT .fetch() nor .updateOne(); we do not want to trigger lifecycle callbacks for a discord message update. We might end up in an infinite loop if we do.
    await sails.models.calendar.update(
      { ID: inputs.event.calendarID || inputs.event.ID },
      { discordCalendarMessage: message.id }
    );

    // Also add schedule message
    await sails.helpers.discord.calendar.postSchedule(inputs.event, channel.id);

    return message;
  },
};
