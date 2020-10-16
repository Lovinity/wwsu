const bcrypt = require("bcrypt");
module.exports = {
  friendlyName: "directors / add",

  description: "Add a new director into the system.",

  inputs: {
    name: {
      type: "string",
      required: true,
      description: "The director to add.",
    },

    login: {
      type: "string",
      required: true,
      description: "The login used for the clock-in and clock-out computer.",
    },

    email: {
      type: "string",
      isEmail: true,
      description: "The email address of the director",
    },

    admin: {
      type: "boolean",
      defaultsTo: false,
      description: "Is this director an administrator? Defaults to false.",
    },

    assistant: {
      type: "boolean",
      defaultsTo: false,
      description:
        "Is this director an assistant director opposed to a main director? Defaults to false.",
    },

    position: {
      type: "string",
      required: true,
      description:
        "The description of the position of this director (such as general manager).",
    },

    emailEmergencies: {
      type: "boolean",
      defaultsTo: false,
      description: "Should this director receive emails of critical problems?",
    },

    emailCalendar: {
      type: "boolean",
      defaultsTo: false,
      description:
        "Should this director receive emails regarding calendar events and shows?",
    },

    emailWeeklyAnalytics: {
      type: "boolean",
      defaultsTo: false,
      description:
        "Should this director receive emails every week with analytics?",
    },
  },

  exits: {},

  fn: async function (inputs, exits) {
    sails.log.debug("Controller directors/add called.");

    try {
      // Add the director and bcrypt the login
      await sails.models.directors
        .create({
          name: inputs.name,
          login: bcrypt.hashSync(inputs.login, 10),
          admin: inputs.admin,
          assistant: inputs.assistant,
          position: inputs.position,
          present: 0,
          emailEmergencies: inputs.emailEmergencies,
          emailCalendar: inputs.emailCalendar,
          emailWeeklyAnalytics: inputs.emailWeeklyAnalytics,
          since: moment().toISOString(),
        })
        .fetch();
      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  },
};
