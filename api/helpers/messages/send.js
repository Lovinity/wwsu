var sh = require("shorthash");

module.exports = {
  friendlyName: "messages.send",

  description: "Send out client messages",

  inputs: {
    from: {
      type: "string",
      required: true,
      description: "ID of the client sending the message."
    },
    to: {
      type: "string",
      required: true,
      description: "ID of the client to receive the message."
    },

    toFriendly: {
      type: "string",
      required: true,
      description: "Friendly name of the client to receive the message."
    },

    message: {
      type: "string",
      required: true,
      description: "The message."
    }
  },

  fn: async function(inputs, exits) {
    sails.log.debug("Helper messages.send called.");
    sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);
    try {
      // Filter disallowed HTML
      inputs.message = await sails.helpers.sanitize(inputs.message);

      // Filter profanity
      inputs.message = await sails.helpers.filterProfane(inputs.message);

      // Truncate after 1024 characters
      inputs.message = await sails.helpers.truncateText(inputs.message, 1024);

      // Grab data pertaining to the host that is retrieving messages. Create if not exists.
      var stuff = await sails.models.hosts.findOne({ host: inputs.from });
      sails.log.silly(`Host: ${stuff}`);
      if (!stuff) {
        return exits.error(new Error("No host found in the database"));
      }

      inputs.fromFriendly = stuff.friendlyname;

      // Obfuscate the real host
      inputs.from = `computer-${sh.unique(
        inputs.from + sails.config.custom.hostSecret
      )}`;

      // Send public messages in Discord as well. TODO: move these into config.custom
      if (inputs.to === "web-public") {
        let channel;
        let discordMessage;
        if (sails.models.meta.memory.discordChannel) {
          channel = DiscordClient.channels.resolve(
            sails.models.meta.memory.discordChannel
          );
          if (channel)
            discordMessage = await channel.send(
              `**From Web (${inputs.nickname})**: ${inputs.message}`
            );
        } else {
          // General channel
          channel = DiscordClient.channels.resolve("830253279166464042");
          if (channel)
            discordMessage = await channel.send(
              `**From ${inputs.fromFriendly}**: ${inputs.message}`
            );
        }
      }

      // Create the message
      var records = await sails.models.messages
        .create({
          from: inputs.from,
          fromFriendly: inputs.fromFriendly,
          to: inputs.to,
          toFriendly: inputs.toFriendly,
          message: inputs.message,
          discordChannel: channel ? channel.id : null,
          discordMessage: discordMessage ? discordMessage.id : null
        })
        .fetch();
      if (!records) {
        return exits.error(
          new Error("Internal error: Could not save message in database.")
        );
      } else {
        // Broadcast the message over web sockets
        return exits.success();
      }
    } catch (e) {
      return exits.error(e);
    }
  }
};
