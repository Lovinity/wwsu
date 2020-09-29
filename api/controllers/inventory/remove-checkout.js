module.exports = {
  friendlyName: "Inventory / remove-checkout",

  description: "Remove a checkout record",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID of the checkout record to remove.",
    },
  },

  fn: async function (inputs) {
    await sails.models.checkout.destroyOne({ ID: inputs.ID });

    // All done.
    return;
  },
};
