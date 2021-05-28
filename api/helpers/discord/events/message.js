module.exports = {
  friendlyName: "discord.events.message",

  description: "DiscordClient message event",

  inputs: {
    message: {
      type: "ref",
      required: true,
      description: "The message object"
    }
  },

  fn: async function(inputs) {
    // Ignore DM messages and messages from self
    if (
      inputs.message.author.id === DiscordClient.user.id ||
      !inputs.message.guild
    )
      return;

    // Determine if we should ignore this message based on criteria. Also determine if the message should be sent publicly or simply logged.
    // TODO: Migrate these settings to config.custom
    let ignoreMessage = true;
    let sendPublic = false;

    // If the message was posted in a channel within general discussion category, do not ignore.
    if (
      inputs.message.channel.parent &&
      inputs.message.channel.parent.id === "830253279166464040"
    ) {
      ignoreMessage = false;

      // Only send the message publicly if meta discordChannel is not specified, and either we are in sports and the message was sent in the sports channel, or we are not in sports and the message was sent in the general channel.
      if (
        !sails.models.meta.memory.discordChannel &&
        ((sails.models.meta.memory.state.startsWith("sports") &&
          inputs.message.channel.id === "830253279166464044") ||
          (!sails.models.meta.memory.state.startsWith("sports") &&
            inputs.message.channel.id === "830253279166464042"))
      )
        sendPublic = true;
    }

    // If the message was posted in a discord channel pertaining to a calendar event, do not ignore.
    let relevantEvent = sails.models.calendar.calendardb.calendar.find(
      { discordChannel: inputs.message.channel.id },
      true
    );
    if (relevantEvent) {
      ignoreMessage = false;

      // Post publicly if the message was sent in the text channel pertaining to the current broadcast
      if (
        sails.models.meta.memory.discordChannel &&
        relevantEvent.discordChannel === sails.models.meta.memory.discordChannel
      ) {
        sendPublic = true;
      }
    }

    // Force sendPublic false if webchat is disabled
    if (!sails.models.meta.memory.webchat) sendPublic = false;

    // Bail if we did not find any matches
    if (ignoreMessage) return;

    let message = inputs.message.cleanContent;

    // Filter profanity
    message = await sails.helpers.filterProfane(message);

    // Convert attachments to markdown and append to message.
    if (inputs.message.attachments && inputs.message.attachments.size > 0) {
      inputs.message.attachments.each(attachment => {
        message += "\n" + `![attachment](${attachment.url})`;
      });
    }

    // Create the database record for the message. Only mark a "to" if the message was sent in the general category or currently airing show.
    await sails.models.messages
      .create({
        status: "active",
        from: `discord-${inputs.message.author.id}`,
        fromFriendly: `Discord (${
          inputs.message.member && inputs.message.member.nickname
            ? inputs.message.member.nickname
            : inputs.message.author.username
        })`,
        to: sendPublic ? "DJ" : "log",
        toFriendly: sendPublic ? "Public" : "(log only)",
        message: inputs.message.cleanContent,
        discordChannel: inputs.message.channel.id,
        discordMessage: inputs.message.id
      })
      .fetch();

    // React to the message to indicate it was sent to public locations. Remove the reaction after 15 seconds.
    if (sendPublic) {
      inputs.message
        .react("✅")
        .then(reaction => setTimeout(() => reaction.remove(), 15000));
    }
  }
};
