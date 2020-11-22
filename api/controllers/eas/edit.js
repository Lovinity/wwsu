module.exports = {
  friendlyName: "eas / edit-information",

  description: "Resends / edits an EAS alert with new information.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID of the eas to edit."
    },
    information: {
      type: "string",
      description: "If provided, the new information for this alert."
    },
    counties: {
      type: "string",
      description:
        "If provided, the new list of counties this alert is in effect."
    },
    starts: {
      type: "string",
      custom: function(value) {
        return moment(value).isValid();
      },
      description: `If provided, a new moment() parsable string of when the alert starts. Recommended ISO string.`
    },

    expires: {
      type: "string",
      custom: function(value) {
        return moment(value).isValid();
      },
      description: `If provided, a new moment() parsable string of when the alert expires. Recommended ISO string.`
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller eas/edit called.");

    try {
      // Get (and remove) the original record
      var record = await sails.models.eas.destroyOne({ ID: inputs.ID });
      if (!record) throw new Error("The provided alert ID does not exist.");

      // Add the alert to EAS
      await sails.helpers.eas.addAlert(
        moment().valueOf(),
        "WWSU",
        inputs.counties || record.counties,
        record.alert,
        record.severity,
        inputs.starts !== null && typeof inputs.starts !== "undefined"
          ? moment(inputs.starts).toISOString(true)
          : moment(record.starts).toISOString(true),
        inputs.expires !== null && typeof inputs.expires !== "undefined"
          ? moment(inputs.expires).toISOString(true)
          : moment(record.expires).toISOString(true),
        record.color,
        inputs.information || record.information
      );

      // Process post tasks (this is what actually pushes the new alert out)
      await sails.helpers.eas.postParse();

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  }
};
