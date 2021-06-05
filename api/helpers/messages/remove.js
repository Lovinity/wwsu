module.exports = {
  friendlyName: "messages.remove",

  description: "Delete a single message.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID number of the message to delete."
    }
  },

  fn: async function(inputs, exits) {
    sails.log.debug("Helper messages.remove called.");
    try {
      // Mark message as removed. Do not actually destroy it; we want it in the database for archive.
      var record = await sails.models.messages.updateOne(
        { ID: inputs.ID },
        { status: "deleted" }
      );
      if (!record) {
        return exits.error(new Error(`The message does not exist.`));
      } else {
        // If there was a discord message, edit it to say the message was deleted
        if (DiscordClient && record.discordChannel && record.discordMessage) {
          let channel = DiscordClient.channels.resolve(record.discordChannel);
          if (channel) {
            let message;
            try {
              message = await channel.messages.fetch(record.discordMessage);
            } catch (e) {
              /* Ignore errors */
            }
            if (message) {
              await message.edit(
                `:x: **Original message was deleted** :x:`
              );
            }
          }
        }
        return exits.success();
      }
    } catch (e) {
      return exits.error(e);
    }
  }
};
