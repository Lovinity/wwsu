const cryptoRandomString = require("crypto-random-string");

module.exports = {
  friendlyName: "directors / remove",

  description: "Remove a director from the system.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The director ID to remove.",
    },
  },

  exits: {
    conflict: {
      statusCode: 409,
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug("Controller directors/remove called.");
    sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`);

    try {
      // Do not allow removing of master director
      if (inputs.ID === 1)
        return new Error("Not allowed to remove the master director");

      // Determine if we need to lock out of editing admin
      var lockout = await sails.models.directors.count({ admin: true });

      // Figure out what director we are going to be removing
      var toDestroy = await sails.models.directors.find({ ID: inputs.ID });

      // Block requests to remove this director if there are 1 or less admin directors and this director is an admin.
      if (lockout <= 1 && toDestroy.admin) {
        return exits.conflict(
          "To prevent accidental lockout, this request was denied because there are 1 or less admin directors. Make another director admin first before removing this director."
        );
      }

      await sails.models.directors.destroy({ ID: inputs.ID }).fetch();

      // As a security measure, invalidate all tokens for directors and admin directors by changing the secret.
      sails.config.custom.secrets.director = cryptoRandomString({
        length: 256,
      });
      sails.config.custom.secrets.adminDirector = cryptoRandomString({
        length: 256,
      });

      // Also remove the director's push notification subscriptions
      await sails.models.subscribers
        .destroy({
          type: [
            "emergencies",
            "accountability-shows",
            "accountability-directors",
          ],
          subtype: inputs.ID,
        })
        .fetch();

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  },
};
