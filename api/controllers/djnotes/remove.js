module.exports = {
  friendlyName: "djnotes / Remove",

  description: "Remove djnotes entry.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID of the record to remove."
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller djnotes/edit called.");

    try {
      // Remove this record
      await sails.models.djnotes.destroy({ ID: inputs.ID }).fetch();

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  }
};
