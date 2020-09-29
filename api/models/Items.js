/**
 * Items.js
 *
 * @description :: The items in the inventory system.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: "inventory",
  attributes: {
    ID: {
      type: "number",
      autoIncrement: true,
    },

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
    },

    subLocation: {
      type: "string",
      allowNull: true,
    },

    name: {
      type: "string",
      required: true,
    },

    make: {
      type: "string",
      allowNull: true,
    },

    model: {
      type: "string",
      allowNull: true,
    },

    otherInfo: {
      type: "string",
      allowNull: true,
    },

    quantity: {
      type: "number",
      defaultsTo: 1,
    },

    condition: {
      type: "string",
      required: true,
      isIn: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
    },

    canCheckOut: {
      type: "boolean",
      defaultsTo: false,
    },

    checkoutRecords: {
      collection: 'checkout',
      via: 'item'
    }
  },

  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord };
    sails.log.silly(`items socket: ${data}`);
    sails.sockets.broadcast("items", "items", data);

    return proceed();
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord };
    sails.log.silly(`items socket: ${data}`);
    sails.sockets.broadcast("items", "items", data);

    return proceed();
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID };
    sails.log.silly(`items socket: ${data}`);
    sails.sockets.broadcast("items", "items", data);

    // Remove checkout records for this item as well
    sails.models.checkout
      .destroy({ item: destroyedRecord.ID })
      .fetch()
      .exec(() => {});

    return proceed();
  },
};
