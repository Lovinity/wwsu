var jwt = require("jsonwebtoken");

module.exports = {
  friendlyName: "Auth / Host",

  description: "Authorize a host and get a token.",

  inputs: {
    username: {
      type: "string",
      description: "The host to authorize.",
      required: true
    }
  },

  exits: {
    success: {
      statusCode: 200
    },
    noToken: {
      statusCode: 401
    },
    error: {
      statusCode: 500
    }
  },

  fn: async function(inputs, exits) {
    sails.log.debug("Controller auth/host called.");

    try {
      // Verify the host first
      var host = await sails.models.hosts.findOrCreate(
        { host: inputs.username },
        {
          host: inputs.username,
          friendlyname: `UNKNOWN ${inputs.username.substr(
            inputs.username.length - 8
          )}`
        }
      );

      if (!host || !host.authorized) {
        return exits.noToken({
          errToken: `The provided host either does not exist or is not authorized. To grant access, please use a DJ Controls with administrator privileges and authorize the host ${inputs.username}`
        });
      }

      // Generate the token valid for 10 minutes
      var token = jwt.sign(
        {
          ID: host.ID,
          host: host.host,
          admin: host.admin,
          lockToDJ: host.lockToDJ,
          makeCalls: host.authorized && host.makeCalls,
          answerCalls: host.authorized && host.answerCalls,
          exp: Math.floor(Date.now() / 1000) + 60 * 10
        },
        sails.config.custom.secrets.host,
        { subject: "host" }
      );

      // Return the token as an object
      return exits.success({ token: token, expires: 60000 * 10 });
    } catch (e) {
      return exits.error(e);
    }
  }
};
