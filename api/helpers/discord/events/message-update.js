module.exports = {
  friendlyName: "Message update",

  description: "",

  inputs: {
    oldMessage: {
      type: "ref",
      required: true,
      description: "The old message object"
    },
    message: {
      type: "ref",
      required: true,
      description: "The new message object"
    }
  },

  fn: async function(inputs) {
    let message = inputs.message.cleanContent;

    // Filter profanity
    message = await sails.helpers.filterProfane(message);

    // Convert attachments to markdown and append to message.
    if (inputs.message.attachments && inputs.message.attachments.size > 0) {
      inputs.message.attachments.each(attachment => {
        message += "\n" + `![attachment](${attachment.url})`;
      });
    }

    // Update the message if it exists
    await sails.models.messages
      .update({ discordMessage: inputs.message.id }, { message: message })
      .fetch();
  }
};
