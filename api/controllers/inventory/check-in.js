module.exports = {
  friendlyName: "inventory / check-in",

  description: "Check an item back in",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The checkout record.",
    },

    checkInDate: {
      type: "string",
      required: true,
      description: "When the item was checked in.",
      custom: function (value) {
        return moment(value).isValid();
      },
    },

    checkInCondition: {
      type: "string",
      required: true,
      isIn: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
      description: "The condition of the item when checked back in.",
    },

    checkInQuantity: {
      type: "number",
      required: true,
      description: "The number of items returned.",
    },

    checkInNotes: {
      type: "string",
      description: "Notes for check-in.",
    },
  },

  fn: async function (inputs) {
    // Check for records
    var record = await sails.models.checkout.findOne({ ID: inputs.ID });
    if (!record) return "CHECKOUT_NOT_FOUND";
    var item = await sails.models.items.findOne({ ID: record.item });
    if (!item) return "ITEM_NOT_FOUND";

    var criteria = {
      checkInDate: moment(inputs.checkInDate).toISOString(true),
      checkInCondition: inputs.checkInCondition,
      checkInQuantity: inputs.checkInQuantity,
      checkInNotes: inputs.checkInNotes,
    };

    var criteriaB = _.cloneDeep(criteria);

    await sails.models.checkout.updateOne({ ID: inputs.ID }, criteriaB);

    // All done.
    return;
  },
};
