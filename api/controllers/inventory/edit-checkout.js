module.exports = {
  friendlyName: "Inventory / edit-checkout",

  description: "Edit a checkout record",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The record to edit",
    },

    name: {
      type: "string",
    },

    checkOutDate: {
      type: "string",
      description: "The date/time the item was checked out. Defaults to now.",
      custom: function (value) {
        return moment(value).isValid();
      },
    },

    checkOutCondition: {
      type: "string",
      isIn: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
    },

    checkOutQuantity: {
      type: "number",
    },

    checkOutNotes: {
      type: "string",
    },

    checkInDue: {
      type: "string",
      description: "When the item is expected to be checked back in.",
      custom: function (value) {
        return moment(value).isValid();
      },
    },

    checkInDate: {
      type: "string",
      description: "When the item was checked in.",
      custom: function (value) {
        return moment(value).isValid();
      },
    },

    checkInCondition: {
      type: "string",
      isIn: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
    },

    checkInQuantity: {
      type: "number",
    },

    checkInNotes: {
      type: "string",
    },
  },

  fn: async function (inputs) {
    var criteria = {
      name: inputs.name,
      checkOutDate: inputs.checkOutDate
        ? moment(inputs.checkOutDate).toISOString(true)
        : undefined,
      checkOutCondition: inputs.checkOutCondition,
      checkOutQuantity: inputs.checkOutQuantity,
      checkOutNotes: inputs.checkOutNotes,
      checkInDue: inputs.checkInDue
        ? moment(inputs.checkInDue).toISOString(true)
        : undefined,
      checkInDate: inputs.checkInDate
        ? moment(inputs.checkInDate).toISOString(true)
        : undefined,
      checkInCondition: inputs.checkInCondition,
      checkInQuantity: inputs.checkInQuantity,
      checkInNotes: inputs.checkInNotes,
    };

    var criteriaB = _.cloneDeep(criteria);

    await sails.models.checkout.updateOne({ ID: inputs, ID }, criteriaB);

    return;
  },
};
