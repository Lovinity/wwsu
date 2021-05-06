const cryptoRandomString = require("crypto-random-string");

module.exports = {
  friendlyName: "djs / inactive",

  description: "Mark a DJ as inactive in the system.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The DJ ID to mark inactive."
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller djs/inactive called.");

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
