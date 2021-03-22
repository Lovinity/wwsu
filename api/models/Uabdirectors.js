/**
 * Directors.js
 *
 * @description :: A model containing all of the station directors.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

const cryptoRandomString = require("crypto-random-string");

module.exports = {
  // This model is only a container for temporary data. It should not persist. Use memory instead of SQL.
  datastore: "timesheets",
  attributes: {
    ID: {
      type: "number",
      autoIncrement: true,
    },

    name: {
      type: "string",
      required: true,
      unique: true,
    },

    login: {
      type: "string",
      required: true,
    },

    admin: {
      type: "boolean",
      defaultsTo: false,
    },

    avatar: {
      // HTML path relative to assets/images/avatars/
      type: "string",
      allowNull: true,
    },

    position: {
      type: "string",
      defaultsTo: "Unknown",
    },

    present: {
      type: "boolean",
      defaultsTo: false,
    },

    since: {
      type: "ref",
      columnType: "datetime",
    },
  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    delete newlyCreatedRecord.login;
    var data = { insert: newlyCreatedRecord };
    sails.log.silly(`uabdirectors socket: ${data}`);
    sails.sockets.broadcast("uabdirectors", "uabdirectors", data);
    return proceed();
  },

  afterUpdate: function (updatedRecord, proceed) {
    delete updatedRecord.login;
    var data = { update: updatedRecord };
    sails.log.silly(`uabdirectors socket: ${data}`);
    sails.sockets.broadcast("uabdirectors", "uabdirectors", data);

    // As a security measure, invalidate all tokens for UAB directors and admin directors by changing the secret.
    sails.config.custom.secrets.directorUab = cryptoRandomString({
      length: 256,
    });
    sails.config.custom.secrets.adminDirectorUab = cryptoRandomString({
      length: 256,
    });

    return proceed();
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID };
    sails.log.silly(`uabdirectors socket: ${data}`);
    sails.sockets.broadcast("uabdirectors", "uabdirectors", data);

    // As a security measure, invalidate all tokens for UAB directors and admin directors by changing the secret.
    sails.config.custom.secrets.directorUab = cryptoRandomString({
      length: 256,
    });
    sails.config.custom.secrets.adminDirectorUab = cryptoRandomString({
      length: 256,
    });

    return proceed();
  },
};
