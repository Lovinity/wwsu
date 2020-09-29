module.exports = {
  friendlyName: "Inventory / Add",

  description: "Add item to the inventory.",

  inputs: {
    location: {
      type: "string",
      required: true,
      isIn: [
        "Lobby",
        "OnAir Studio",
        "Production Studio",
        "GM Office",
        "Engineering",
        "Penthouse",
      ],
      description: "Room location of the item"
    },

    subLocation: {
      type: "string",
      allowNull: true,
      description: "Description of where in the room the item is located (such as filing cabinet, or box B)"
    },

    name: {
      type: "string",
      required: true,
      description: "Name of the item"
    },

    make: {
      type: "string",
      allowNull: true,
      description: "Brand of the item"
    },

    model: {
      type: "string",
      allowNull: true,
      description: "Model of the item"
    },

    otherInfo: {
      type: "string",
      allowNull: true,
      description: "Other information about the item"
    },

    quantity: {
      type: "number",
      defaultsTo: 1,
      description: "The number of this item available"
    },

    condition: {
      type: "string",
      required: true,
      isIn: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
      description: "Condition of the item"
    },

    canCheckOut: {
      type: "boolean",
      defaultsTo: false,
      description: "Is it permitted for others to check out this item?"
    },
  },

  fn: async function (inputs) {
    var criteria = {
      location: inputs.location,
      subLocation: inputs.subLocation,
      name: inputs.name,
      make: inputs.make,
      model: inputs.model,
      otherInfo: inputs.otherInfo,
      quantity: inputs.quantity,
      condition: inputs.condition,
      canCheckOut: inputs.canCheckOut,
    };

    await sails.models.items.create(criteria).fetch();

    return;
  },
};
