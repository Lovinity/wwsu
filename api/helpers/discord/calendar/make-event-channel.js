module.exports = {
  friendlyName: "Make Event channel",

  description: "Get or create the discord channel of a calender event",

  inputs: {
    event: {
      type: "json",
      required: true
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
    let reason = `New event`;

    // If discordChannel is set, try to retrieve it and return it if it exists.
    if (inputs.event.discordChannel) {
      reason = `Event channel no longer existed`;
      channel = DiscordClient.channels.resolve(inputs.event.discordChannel);

      // If channel exists, update its name and description in case they were edited. And return the channel.
      if (channel) {
        channel = await channel.edit(
          {
            name: await sails.helpers.discord.toChannelName(inputs.event.name),
            topic: `${inputs.event.type}: ${inputs.event.description}`
          },
          "Event changed in the system"
        );
        return channel;
      }
    }

    // At this point, the channel does not exist. Create it in our configured guild but only if the event is active.
    if (!inputs.event.active) return;
    let guild = DiscordClient.guilds.resolve(sails.config.custom.discord.guild);
    if (!guild) return;
    channel = await guild.channels.create(
      await sails.helpers.discord.toChannelName(inputs.event.name),
      {
        topic: `${inputs.event.type}: ${inputs.event.description}`,
        rateLimitPerUser: 15,
        reason: reason,
        parent: sails.config.custom.discord.categories.defaultShow
      }
    );

    // Be sure to update current meta DiscordChannel if the event calendar ID is on the air right now.
    if (sails.models.meta.memory.calendarID === inputs.event.calendarID) {
      await sails.helpers.meta.change.with({ discordChannel: channel.id });
    }

    // You should update discordChannel in the database from whatever called this helper. We do not do it here because it will trigger multiple messages.

    return channel;
  }
};
