module.exports = {
  friendlyName: "Inventory / check-out",

  description: "Check an item out",

  inputs: {
    item: {
      type: "number",
      required: true,
      description: "The ID of the item being checked out"
    },

    name: {
      type: "string",
      required: true,
      description: "The full name of the person checking the item out"
    },

    checkOutDate: {
      type: "string",
      required: true,
      description: "The date/time the item was checked out. Defaults to now.",
      custom: function(value) {
        return moment(value).isValid();
      }
    },

    checkOutCondition: {
      type: "string",
      isIn: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
      description:
        "The condition of the item when checked out. Defaults to the condition specified in items."
    },

    checkOutQuantity: {
      type: "number",
      required: true,
      description:
        "The number of items checked out. Must be less than or equal to the item's available quantity."
    },

    checkOutNotes: {
      type: "string",
      description: "Any additional check-out notes."
    },

    checkInDue: {
      type: "string",
      description: "When the item is expected to be checked back in.",
      custom: function(value) {
        return moment(value).isValid();
      }
    }
  },

  fn: async function(inputs) {
    // Check for item
    var record = await sails.models.items.findOne({ ID: inputs.item });
    if (!record) return "ITEM_NOT_FOUND";

    // Check if the item may be checked out
    if (!record.canCheckOut) return "CANNOT_CHECK_OUT";

    // Check if the specified quantity is available for checking out
    if (
      inputs.checkOutQuantity >
      (await sails.helpers.inventory.getAvailableQuantity(inputs.item))
    ) {
      return "QUANTITY_NOT_AVAILABLE";
    }

    var criteria = {
      item: inputs.item,
      name: inputs.name,
      checkOutDate: moment(inputs.checkOutDate).toISOString(true),
      checkOutCondition: inputs.checkOutCondition || record.condition,
      checkOutQuantity: inputs.checkOutQuantity,
      checkOutNotes: inputs.checkOutNotes,
      checkInDue: inputs.checkInDue
        ? moment(inputs.checkInDue).toISOString(true)
        : undefined
    };

    await sails.models.checkout.create(criteria).fetch();

    return;
  }
};
