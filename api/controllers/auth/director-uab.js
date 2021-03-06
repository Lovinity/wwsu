/* global Hosts, sails, Djs, host, Directors, DJ, Uabdirectors */
var jwt = require("jsonwebtoken");
var bcrypt = require("bcrypt");
module.exports = {
  friendlyName: "Auth / director-uab",

  description: "Authorize a UAB director and get a token.",

  inputs: {
    username: {
      type: "string",
      description: "The name of the director to authorize.",
      required: true,
    },

    password: {
      type: "string",
      description: "Director login to authorize.",
      required: true,
    },
  },

  exits: {
    success: {
      statusCode: 200,
    },
    noToken: {
      statusCode: 401,
    },
    error: {
      statusCode: 500,
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug("Controller auth/director-uab called.");

    try {
      // Verify the Director exists first
      var director = await sails.models.uabdirectors.findOne({
        name: inputs.username,
      });
      if (!director)
        return exits.noToken({
          errToken:
            "The provided director either does not exist or is not authorized.",
        });

      // Now check the password
      var match = await bcrypt.compare(inputs.password, director.login);

      if (!match)
        return exits.noToken({
          errToken:
            "The provided director either does not exist or is not authorized.",
        });

      // Generate the token valid for 10 minutes
      var token = jwt.sign(
        {
          ID: director.ID,
          name: director.name,
          exp: Math.floor(Date.now() / 1000) + 60 * 10,
        },
        sails.config.custom.secrets.directorUab,
        { subject: "directorUab" }
      );

      // Return the token as an object
      return exits.success({ token: token, expires: 60000 * 10 });
    } catch (e) {
      return exits.error(e);
    }
  },
};
