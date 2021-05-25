module.exports = {
  friendlyName: "Message delete bulk",

  description: "Discord messagesDeleteBulk event",

  inputs: {
    messages: {
      type: "ref",
      required: true,
      description: "Collection of messages deleted"
    }
  },

  fn: async function(inputs) {
    // Just trigger the regular messageDelete event on every message deleted
    inputs.messages.forEach(async message => {
      await sails.helpers.discord.events.messageDelete(message);
    });
  }
};
