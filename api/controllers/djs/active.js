module.exports = {
  friendlyName: "djs / active",

  description: "Mark a DJ as active in the system.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The DJ ID to mark active."
    }
  },

  exits: {},

  fn: async function(inputs, exits) {
    sails.log.debug("Controller djs/active called.");

    try {
      // Mark DJ as active.
      await sails.models.djs.updateOne(
        { ID: inputs.ID },
        {
          active: true,
          // Set last seen to now so auto-cleanup does not re-mark DJ as inactive. It is assumed when marking a DJ active again, they have been "seen".
          lastSeen: moment().toISOString(true)
        }
      );

      return exits.success();
    } catch (e) {
      return exits.error(e);
    }
  }
};
