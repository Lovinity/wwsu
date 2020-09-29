module.exports = {
  friendlyName: "Inventory / Remove",

  description:
    "Remove inventory item from the system (and all its checkout records).",

  inputs: {
    ID: {
      type: "number",
      required: true,
    },
  },

  fn: async function (inputs) {
    await sails.models.items.destroyOne({ ID: inputs.ID });

    // All done.
    return;
  },
};
