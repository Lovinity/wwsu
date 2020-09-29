module.exports = {
  friendlyName: "sails.helpers.inventory.getAvailableQuantity",

  description: "Calculate the available quantity of a provided inventory item",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The ID of the item to calculate quantity.",
    },
  },

  exits: {},

  fn: async function (inputs) {
    // Get main item record
    var item = await sails.models.items.findOne({ ID: inputs.ID });
    if (!item) return 0;
    var quantity = item.quantity;

    // Check checkout records
    var checkOut = await sails.models.checkout.find({
      item: inputs.ID,
    });

    // Calculate available quantity from checkout records
    checkOut.map((record) => {
      if (record.checkOutQuantity) quantity -= record.checkOutQuantity;
      if (record.checkInQuantity) quantity += record.checkInQuantity;
    });

    // Return array duple [expected quantity, available/actual quantity]
    return [item.quantity, quantity];
  },
};
