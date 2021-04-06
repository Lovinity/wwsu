const cryptoRandomString = require("crypto-random-string");

module.exports = {
  friendlyName: "djs / remove",

  description: "Remove a DJ from the system.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The DJ ID to remove.",
    },
  },

  exits: {},

  fn: async function (inputs, exits) {
    sails.log.debug("Controller djs/remove called.");

    try {
      // Destroy DJ
      await sails.models.djs.destroy({ ID: inputs.ID }).fetch();

      // As a security measure, invalidate all tokens for DJs by changing the secret.
      sails.config.custom.secrets.dj = cryptoRandomString({ length: 256 });

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  },
};
