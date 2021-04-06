/**
 * Hosts.js
 *
 * @description :: Hosts contains the computers that use DJ Controls, their friendly name, and which kinds of messages they should receive.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: "nodebase",
  attributes: {
    ID: {
      type: "number",
      autoIncrement: true,
    },

    host: {
      type: "string",
      required: true,
      unique: true,
    },

    friendlyname: {
      type: "string",
      defaultsTo: "Unknown Host",
    },

    app: {
      type: "string",
      allowNull: true,
    },

    authorized: {
      type: "boolean",
      defaultsTo: false,
    },

    admin: {
      type: "boolean",
      defaultsTo: false,
    },

    lockToDJ: {
      type: "number",
      allowNull: true,
    },

    makeCalls: {
      type: "boolean",
      defaultsTo: false,
    },

    answerCalls: {
      type: "boolean",
      defaultsTo: false,
    },

    silenceDetection: {
      type: "boolean",
      defaultsTo: false,
    },

    recordAudio: {
      type: "boolean",
      defaultsTo: false,
    },

    delaySystem: {
      type: "boolean",
      defaultsTo: false,
    },

    EAS: {
      type: "boolean",
      defaultsTo: false,
    },

    requests: {
      type: "boolean",
      defaultsTo: false,
    },

    emergencies: {
      type: "boolean",
      defaultsTo: false,
    },

    accountability: {
      type: "boolean",
      defaultsTo: false,
    },

    webmessages: {
      type: "boolean",
      defaultsTo: false,
    },
  },

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord };
    sails.log.silly(`hosts socket: ${data}`);
    sails.sockets.broadcast("hosts", "hosts", data);
    return proceed();
  },

  afterUpdate: function (updatedRecord, proceed) {
    var data = { update: updatedRecord };
    sails.log.silly(`hosts socket: ${data}`);
    sails.sockets.broadcast("hosts", "hosts", data);

    (async () => {
      // Edit the status of recorder if necessary
      if (!(await sails.models.hosts.count({ recordAudio: true })))
        await sails.helpers.status.change.with({
          name: `recorder`,
          status: 3,
          label: `Recorder`,
          data: `There are no hosts currently set for recording audio. To set a responsible host, go in an administration DJ Controls and click Hosts.<br /><strong>Be prepared to manually record your broadcasts</strong> until this is resolved.`,
        });
    })();

    return proceed();
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID };
    sails.log.silly(`hosts socket: ${data}`);
    sails.sockets.broadcast("hosts", "hosts", data);

    (async () => {
      // Edit the status of recorder if necessary
      if (!(await sails.models.hosts.count({ recordAudio: true })))
        await sails.helpers.status.change.with({
          name: `recorder`,
          status: 3,
          label: `Recorder`,
          data: `There are no hosts currently set for recording audio. To set a responsible host, go in an administration DJ Controls and click Hosts.<br /><strong>Be prepared to manually record your broadcasts</strong> until this is resolved.`,
        });
    })();

    return proceed();
  },
};
