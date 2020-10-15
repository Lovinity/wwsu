const bcrypt = require("bcrypt");
module.exports = {
  friendlyName: "directors / edit",

  description: "Edit one of the directors in the system.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID of the director to edit.",
    },

    name: {
      type: "string",
      description: "If provided, the director will be renamed to this.",
    },

    login: {
      type: "string",
      description:
        "If provided, the login for the director will be changed to this.",
    },

    email: {
      type: "string",
      isEmail: true,
      description:
        "If provided, the email for the director will be changed to this.",
    },

    admin: {
      type: "boolean",
      description:
        "If provided, the admin status of the director will be changed to this.",
    },

    assistant: {
      type: "boolean",
      description:
        "If provided, the assistant status of the director will be changed to this.",
    },

    position: {
      type: "string",
      description:
        "If provided, the director position will be changed to this.",
    },

    emailEmergencies: {
      type: "boolean",
      description: "Should this director receive emails of critical problems?",
    },

    emailCalendar: {
      type: "boolean",
      description:
        "Should this director receive emails regarding calendar events and shows?",
    },

    emailWeeklyAnalytics: {
      type: "boolean",
      description:
        "Should this director receive emails every week with analytics?",
    },
  },

  exits: {
    conflict: {
      statusCode: 409,
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug("Controller directors/edit called.");

    try {
      // Do not allow editing of the master director if we did not authorize with master director
      if (inputs.ID === 0 && this.req.payload.ID !== 0)
        return new Error("Not allowed to edit the master director with any authorization other than the master director.");

      // If editing master director, do not allow disabling of the admin setting
      if (inputs.ID === 0)
        inputs.admin = true;

      // Determine if we need to lock out of editing admin
      var lockout = await sails.models.directors.count({ admin: true });

      // Block requests to change admin  to false if there are 1 or less admin directors.
      if (
        lockout <= 1 &&
        typeof inputs.admin !== "undefined" &&
        !inputs.admin
      ) {
        return exits.conflict(
          "To prevent accidental lockout, this request was denied because there are 1 or less admin directors. Make another director an admin first before removing admin status from this director."
        );
      }

      // Determine what needs updating
      var criteria = {};
      if (typeof inputs.name !== "undefined" && inputs.name !== null) {
        criteria.name = inputs.name;
      }

      if (
        typeof inputs.login !== "undefined" &&
        inputs.login !== null &&
        inputs.login !== ""
      ) {
        criteria.login = bcrypt.hashSync(inputs.login, 10);
      }

      if (typeof inputs.email !== "undefined" && inputs.email !== null) {
        criteria.email = inputs.email;
      }

      if (inputs.email === "remove@example.com") {
        criteria.email = null;
      }

      if (typeof inputs.admin !== "undefined" && inputs.admin !== null) {
        criteria.admin = inputs.admin;
      }

      if (
        typeof inputs.assistant !== "undefined" &&
        inputs.assistant !== null
      ) {
        criteria.assistant = inputs.assistant;
      }

      if (typeof inputs.position !== "undefined" && inputs.position !== null) {
        criteria.position = inputs.position;
      }

      if (
        typeof inputs.emailEmergencies !== "undefined" &&
        inputs.emailEmergencies !== null
      ) {
        criteria.emailEmergencies = inputs.emailEmergencies;
      }

      if (
        typeof inputs.emailCalendar !== "undefined" &&
        inputs.emailCalendar !== null
      ) {
        criteria.emailCalendar = inputs.emailCalendar;
      }

      if (
        typeof inputs.emailWeeklyAnalytics !== "undefined" &&
        inputs.emailWeeklyAnalytics !== null
      ) {
        criteria.emailWeeklyAnalytics = inputs.emailWeeklyAnalytics;
      }

      // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
      var criteriaB = _.cloneDeep(criteria);

      // Edit it
      await sails.models.directors.update({ ID: inputs.ID }, criteriaB).fetch();

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  },
};
