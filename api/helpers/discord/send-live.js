module.exports = {
  friendlyName: "Send live",

  description:
    "Use the going live webhook to let others know in the Discord that a show is going live.",

  inputs: {
    event: {
      type: "json",
      description: "Event object triggering the notification.",
    },
  },

  exits: {
    success: {
      description: "All done.",
    },
  },

  fn: async function (inputs) {
    // Skip if the event is not a broadcast
    if (
      !inputs.event ||
      ["show", "remote", "sports", "prerecord", "playlist"].indexOf(
        inputs.event.type
      ) === -1
    )
      return;

    // Construct a Discord embed
    let embed = new Discord.MessageEmbed()
      .setColor(sails.models.calendar.calendardb.getColor(inputs.event))
      .setTitle(
        `:radio: ${inputs.event.type}: ${inputs.event.hosts} - ${inputs.event.name} is now on the air!`
      )
      .setDescription(sails.models.meta.memory.topic || "No topic provided")
      .setURL("https://server.wwsu1069.org")
      .addField(
        "Scheduled Time",
        `${moment(inputs.event.start).format("LT")} - ${moment(
          inputs.event.end
        ).format("LT")}`
      )
      .setFooter(
        `Tune in on WWSU 106.9 FM or click the title to listen online`
      );
    if (inputs.event.banner) embed = embed.setImage(inputs.event.banner);
    if (inputs.event.logo) embed = embed.setThumbnail(inputs.event.logo);

    // Get the live channel
    let channel = await DiscordClient.channels.resolve(
      sails.config.custom.discord.channels.live
    );

    // Send the embed
    if (channel) await channel.send({ embed: embed });

    return;
  },
};
