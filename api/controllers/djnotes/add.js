module.exports = {
  friendlyName: "djnotes / add",

  description: "Add a djnotes record.",

  inputs: {
    djs: {
      type: "json",
      required: true,
      description: "An array of DJ IDs this note applies to."
    },
    date: {
      type: "string",
      custom: function(value) {
        return moment(value).isValid();
      },
      allowNull: true,
      description: `moment() parsable string of a date in which the record took effect.`
    },
    type: {
      type: "string",
      required: true,
      description:
        "The type of note record (remote-* for remote credits, warning-* for warning points, public-* for public notes visible to the DJ, private-* for records not visible to the DJ.)."
    },
    description: {
      type: "string",
      required: true,
      description: "A description for this record."
    },
    amount: {
      type: "number",
      description:
        "For remote credits, the number of credits earned. For warning, the warning points assigned."
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller djnotes/add called.");

    // No dj nor djArray? Error!
    if (!inputs.djs || inputs.djs.length <= 0) {
      return exits.error(
        "You are required to provide either a dj parameter, or a djArray array."
      );
    }

    try {
      var records = [];

      // Process the records depending on whether we have a single dj, or an array in djArray.
      if (!inputs.djs || inputs.djs.length <= 0) {
        records.push({
          dj: inputs.dj,
          type: inputs.type,
          description: inputs.description,
          amount: inputs.amount,
          date:
            inputs.date !== null && typeof inputs.date !== "undefined"
              ? moment(inputs.date).toISOString(true)
              : moment().toISOString(true)
        });
      } else {
        inputs.djs.map(dj =>
          records.push({
            dj: dj,
            type: inputs.type,
            description: inputs.description,
            amount: inputs.amount,
            date:
              inputs.date !== null && typeof inputs.date !== "undefined"
                ? moment(inputs.date).toISOString(true)
                : moment().toISOString(true)
          })
        );
      }

      // Add the records
      await sails.models.djnotes.createEach(records).fetch();

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  }
};
