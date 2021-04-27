module.exports = {
  friendlyName: "To channel name",

  description: "Convert a string to a channel-friendly name for Discord",

  inputs: {
    text: {
      type: "string",
      required: true,
    },
  },

  exits: {},

  fn: async function (inputs) {
    return inputs.text
      .toLowerCase() // Make everything lower case
      .replace(/\s/g, "-") // Replace all whitespace with a dash -
      .replace("&", "and") // Replace ampersands with the word and
      .replace(/[^0-9a-z]/gi, ""); // Remove all remaining non-alphanumeric characters
  },
};
