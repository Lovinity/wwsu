module.exports = {
  friendlyName: "Send live",

  description:
    "Use the going live webhook to let others know in the Discord that a show is going live.",

  inputs: {
    event: {
      type: "json",
      description: "Event object triggering the notification."
    }
  },

  exits: {
    success: {
      description: "All done."
    }
  },

  fn: async function(inputs) {
    // Skip if the event is not a broadcast
    if (
      !inputs.event ||
      ["show", "remote", "sports", "prerecord", "playlist"].indexOf(
        inputs.event.type
      ) === -1
    )
      return;

    // Construct a Discord embed. TODO: Change general channel to config.custom
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
      .addField(
        `Chat with the DJ`,
        `${
          sails.models.meta.memory.webchat
            ? `${
                inputs.event.discordChannel
                  ? `💬 Please use the <#${inputs.event.discordChannel}> channel to talk about the broadcast; your messages there will be sent to the hosts' control panel (and they will be notified) and to website listeners.`
                  : sails.models.meta.memory.startsWith("sports")
                  ? `💬 Please use the <#830253279166464044> channel to talk about the broadcast; your messages there will be sent to the hosts' control panel (and they will be notified) and website listeners.`
                  : `💬 Please use the <#830253279166464042> channel to talk about the broadcast; your messages there will be sent to the hosts' control panel (and they will be notified) and website listeners.`
              }`
            : `The hosts have the chat with DJ feature disabled and will not receive any messages unless they are logged into Discord.`
        }`
      )
      .setFooter(
        `Tune in on WWSU 106.9 FM or click the embed title to listen online`
      );
    if (inputs.event.banner)
      embed = embed.setImage(
        `https://server.wwsu1069.org/uploads/calendar/banner/${inputs.event.banner}`
      );
    if (inputs.event.logo)
      embed = embed.setThumbnail(
        `https://server.wwsu1069.org/uploads/calendar/logo/${inputs.event.logo}`
      );

    // Get the live channel
    let channel = DiscordClient.channels.resolve(
      sails.config.custom.discord.channels.live
    );

    // Send the embed
    if (channel) await channel.send({ embed: embed });

    // Get and send the same message in the show channel if it exists
    if (inputs.event.discordChannel) {
      channel = DiscordClient.channels.resolve(inputs.event.discordChannel);
      if (channel) await channel.send({ embed: embed });
    }

    return;
  }
};
