module.exports = {
  friendlyName: "Message delete",

  description: "Discord messageDelete event",

  inputs: {
    message: {
      type: "ref",
      required: true,
      description: "The message deleted"
    }
  },

  fn: async function(inputs) {
    // Also remove the message from the message database if it exists
    await sails.models.messages
      .update({ discordMessage: inputs.message.id }, { status: "deleted" })
      .fetch();
  }
};
