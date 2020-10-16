/**
 * Timesheet.js
 *
 * @description :: Timesheet manages all the internal clock ins and clock outs of WWSU directors.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: "timesheets",
  attributes: {
    ID: {
      type: "number",
      autoIncrement: true,
    },

    unique: {
      type: "string",
      allowNull: true,
    },

    name: {
      type: "string",
      required: true,
    },

    scheduledIn: {
      type: "ref",
      columnType: "datetime",
    },

    scheduledOut: {
      type: "ref",
      columnType: "datetime",
    },

    timeIn: {
      type: "ref",
      columnType: "datetime",
    },

    timeOut: {
      type: "ref",
      columnType: "datetime",
    },

    notes: {
      type: "string",
      allowNull: true,
    },

    remote: {
      type: "boolean",
      defaultsTo: false,
    },

    approved: {
      type: "number",
      defaultsTo: 1,
      min: -1,
      max: 2,
    },
  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord };
    sails.log.silly(`timesheet socket: ${data}`);
    sails.sockets.broadcast("timesheet", "timesheet", data);
    return proceed();
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord };
    sails.log.silly(`timesheet socket: ${data}`);
    sails.sockets.broadcast("timesheet", "timesheet", data);
    return proceed();
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID };
    sails.log.silly(`timesheet socket: ${data}`);
    sails.sockets.broadcast("timesheet", "timesheet", data);
    return proceed();
  },
};
