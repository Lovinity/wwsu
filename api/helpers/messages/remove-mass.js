module.exports = {
  friendlyName: "messages.removeMass",

  description: "Mass delete all messages sent by a specified host.",

  inputs: {
    host: {
      required: true,
      type: "string",
      description:
        "The unique ID assigned to the host that we are deleting message."
    }
  },

  fn: async function(inputs, exits) {
    sails.log.debug("Helper messages.removeMass called.");
    try {
      // Mark all messages from provided host as deleted
      let records = await sails.models.messages
        .update(
          { or: [{ from: inputs.host }, { fromIP: inputs.host }] },
          { status: "deleted" }
        )
        .fetch();

      if (records && records.length > 0) {
        let maps = records.map(async record => {
          // If there was a discord message, edit it to say the message was deleted
          if (record.discordChannel && record.discordMessage) {
            let channel = DiscordClient.channels.resolve(record.discordChannel);
            if (channel) {
              let message;
              try {
                message = await channel.messages.fetch(record.discordMessage);
              } catch (e) {
                /* Ignore errors */
              }
              if (message) {
                await message.edit(`:x: **Original message was deleted** :x:`);
              }
            }
          }
        });
        await Promise.all(maps);
      }
      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  }
};
