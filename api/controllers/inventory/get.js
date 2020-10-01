module.exports = {
  friendlyName: "Inventory / Get",

  description: "Get inventory items.",

  inputs: {
    ID: {
      type: "number",
      description:
        "If getting a single item and its checkout records, specify it here."
    }
  },

  fn: async function(inputs) {
    if (inputs.ID) {
      var records = await sails.models.items
        .findOne({ ID: inputs.ID })
        .populate("checkoutRecords");

      records.availableQuantity = await sails.helpers.inventory.getAvailableQuantity(
        inputs.ID
      );
    } else {
      var records = await sails.models.items.find();
    }

    // Subscribe to sockets if applicable
    if (this.req.isSocket && !inputs.ID) {
      sails.sockets.join(this.req, "items");
      sails.log.verbose("Request was a socket. Joining items.");
    }

    return records;
  }
};
