module.exports = {
  friendlyName: "Inventory / Edit",

  description: "Edit inventory item.",

  inputs: {
    ID: {
      type: "number",
      required: true
    },

    location: {
      type: "string",
      isIn: [
        "Lobby",
        "OnAir Studio",
        "Production Studio",
        "GM Office",
        "Engineering",
        "Penthouse"
      ]
    },

    subLocation: {
      type: "string"
    },

    name: {
      type: "string"
    },

    make: {
      type: "string"
    },

    model: {
      type: "string"
    },

    otherInfo: {
      type: "string"
    },

    quantity: {
      type: "number"
    },

    condition: {
      type: "string",
      isIn: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"]
    },

    canCheckOut: {
      type: "boolean"
    }
  },

  fn: async function(inputs) {
    var criteria = {
      location: inputs.location,
      subLocation: inputs.subLocation,
      name: inputs.name,
      make: inputs.make,
      model: inputs.model,
      otherInfo: inputs.otherInfo,
      quantity: inputs.quantity,
      condition: inputs.condition,
      canCheckOut: inputs.canCheckOut
    };

    var criteriaB = _.cloneDeep(criteria);

    await sails.models.items.updateOne({ ID: inputs.ID }, criteriaB);

    return;
  }
};
