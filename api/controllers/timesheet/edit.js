module.exports = {
  friendlyName: "Timesheet / Edit",

  description: "Edit a timesheet entry.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID number of the Timesheet being edited.",
    },

    timeIn: {
      type: "string",
      allowNull: true,
      custom: function (value) {
        return moment(value).isValid();
      },
      description:
        "A moment.js compatible timestamp for when the director clocked in.",
    },

    timeOut: {
      type: "string",
      allowNull: true,
      custom: function (value) {
        return value === null || value === "" || moment(value).isValid();
      },
      description:
        "A moment.js compatible timestamp for when the director clocked out. Use null or blank string to indicate the director is still clocked in.",
    },

    approved: {
      type: "number",
      required: true,
      min: -1,
      max: 2,
      description:
        "-1 = absent hours, 0 = not approved timesheet, 1 = approved timesheet / scheduled hours, 2 = cancelled hours",
    },
  },

  exits: {
    forbidden: {
      statusCode: 403,
    },
    success: {
      statusCode: 200,
    },
    notFound: {
      statusCode: 404,
    },
  },

  fn: async function (inputs, exits) {
    sails.log.debug("Controller timesheet/edit called.");

    // Null out empty strings for times
    if (inputs.timeIn === "") inputs.timeIn = null;
    if (inputs.timeOut === "") inputs.timeOut = null;

    // Require timeIn when approved is 0 or 1 (hours)
    if ((inputs.approved === 0 || inputs.approved === 1) && !inputs.timeIn) {
      throw new Error("timeIn is required when approved is 0 or 1.");
    }

    var criteria = {
      timeIn: inputs.timeIn || undefined,
      timeOut: inputs.timeOut || undefined,
      approved: inputs.approved,
    };

    var criteriaB = _.cloneDeep(criteria);

    try {
      // Update the timesheet record
      var records = await sails.models.timesheet
        .update({ ID: inputs.ID }, criteriaB)
        .fetch();

      // Force a re-load of all directors to update any possible changes in presence
      await sails.helpers.directors.update();

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  },
};
