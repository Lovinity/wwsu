const bcrypt = require("bcrypt");
module.exports = {
  friendlyName: "djs / add",

  description:
    "Add a new DJ into the system. Call is ignored if a DJ with the same name already exists.",

  inputs: {
    name: {
      type: "string",
      required: true,
      custom: function(value) {
        // Prevent use of space dash space, or "; ", in names as this will cause problems in the system
        var temp2 = value.split(" - ");
        if (temp2.length > 1) {
          return false;
        }
        var temp3 = value.split("; ");
        if (temp3.length > 1) {
          return false;
        }
        return true;
      },
      description: "The DJ handle to add."
    },

    realName: {
      type: "string",
      description: "The full real name of the DJ."
    },

    email: {
      type: "string",
      description: "The email address of the DJ."
    },

    login: {
      type: "string",
      allowNull: true,
      description: "The login used for DJ-related settings."
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller djs/add called.");
    if (!inputs.login || inputs.login === "") {
      inputs.login = null;
    }

    try {
      // Use findOrCreate because we do not want to create a DJ that already exists
      let record = await sails.models.djs.findOrCreate(
        { name: inputs.name },
        {
          name: inputs.name,
          active: true,
          realName: inputs.realName || null,
          email: inputs.email || null,
          login:
            inputs.login !== null ? bcrypt.hashSync(inputs.login, 10) : null,
          lastSeen: moment().toISOString(true) // Even though the DJ hasn't made a broadcast yet, set this to now so the auto clean-up does not mark the DJ as inactive.
        }
      );
      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  }
};
