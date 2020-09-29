/**
 * Checkout.js
 *
 * @description :: Check-out records for the inventory management.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: "inventory",
  attributes: {
    ID: {
      type: "number",
      autoIncrement: true,
    },

    item: {
      required: true,
      model: "items",
    },

    name: {
      type: "string",
      required: true,
    },

    checkOutDate: {
      type: "ref",
      columnType: "datetime",
      required: true,
    },

    checkOutCondition: {
      type: "string",
      required: true,
      isIn: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
    },

    checkOutQuantity: {
      type: "number",
      required: true,
    },

    checkOutNotes: {
      type: "string",
      allowNull: true,
    },

    checkInDue: {
      type: "ref",
      columnType: "datetime",
    },

    checkInDate: {
      type: "ref",
      columnType: "datetime",
    },

    checkInCondition: {
      type: "string",
      allowNull: true,
      isIn: ["Excellent", "Very Good", "Good", "Fair", "Poor", "Broken"],
    },

    checkInQuantity: {
      type: "number",
      allowNull: true,
    },

    checkInNotes: {
      type: "string",
      allowNull: true,
    },
  },

  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord };
    sails.log.silly(`checkout socket: ${data}`);
    sails.sockets.broadcast("checkout", "checkout", data);

    return proceed();
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord };
    sails.log.silly(`checkout socket: ${data}`);
    sails.sockets.broadcast("checkout", "checkout", data);

    return proceed();
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID };
    sails.log.silly(`checkout socket: ${data}`);
    sails.sockets.broadcast("checkout", "checkout", data);

    return proceed();
  },
};
