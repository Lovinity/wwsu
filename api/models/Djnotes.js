/**
 * Djnotes.js
 *
 * @description :: Notes specific to a dj.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: "nodebase",
  attributes: {
    ID: {
      type: "number",
      autoIncrement: true
    },

    dj: {
      type: "number",
      required: true
    },

    date: {
      type: "ref",
      columnType: "datetime"
    },

    type: {
      type: "string",
      description:
        "System code word to explain what kind of record this is. It should begin with remote- for remote credits, warning- for warning points, public- for notes that should be visible to the DJ, and private- for notes only visible to authorized directors."
    },

    description: {
      type: "string",
      required: true
    },

    amount: {
      type: "number",
      defaultsTo: 0,
      description:
        "For remote credits and warning points, this is the amount to assign."
    }
  },

  // Websockets standards
  afterCreate: function(newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord };
    sails.log.silly(`djnotes socket: ${data}`);
    sails.sockets.broadcast("djnotes", "djnotes", data);
    return proceed();
  },

  afterUpdate: function(updatedRecord, proceed) {
    var data = { update: updatedRecord };
    sails.log.silly(`djnotes socket: ${data}`);
    sails.sockets.broadcast("djnotes", "djnotes", data);
    return proceed();
  },

  afterDestroy: function(destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID };
    sails.log.silly(`djnotes socket: ${data}`);
    sails.sockets.broadcast("djnotes", "djnotes", data);
    return proceed();
  }
};
