const cryptoRandomString = require("crypto-random-string");

module.exports = {
  friendlyName: "djs / remove",

  description: "Mark a DJ as inactive in the system.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The DJ ID to remove."
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller djs/remove called.");

    try {
      // Mark DJ as inactive.
      await sails.models.djs.updateOne({ ID: inputs.ID }, { active: false });

      // As a security measure, invalidate all tokens for DJs by changing the secret.
      sails.config.custom.secrets.dj = cryptoRandomString({ length: 256 });

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  }
};
