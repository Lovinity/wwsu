var breakdance = require("breakdance");

/**
 * Messages.js
 *
 * @description :: Messages is a collection of all the messages sent through the DJ Controls messaging system.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: "nodebase",
  attributes: {
    ID: {
      type: "number",
      autoIncrement: true
    },

    status: {
      type: "string",
      defaultsTo: "active"
    },
    from: {
      type: "string"
    },
    fromFriendly: {
      type: "string"
    },
    fromIP: {
      type: "string",
      defaultsTo: "Not Specified"
    },
    to: {
      type: "string"
    },
    toFriendly: {
      type: "string"
    },
    discordChannel: {
      type: "string",
      allowNull: true,
      description:
        "If not null, this is the discord channel the message was posted in."
    },
    discordMessage: {
      type: "string",
      allowNull: true,
      description: "If not null, this is the discord message ID."
    },
    message: {
      type: "string"
    }
  },

  // Websockets standards
  afterCreate: function(newlyCreatedRecord, proceed) {
    // Do not pass IP addresses through web sockets!
    if (typeof newlyCreatedRecord.fromIP !== "undefined") {
      delete newlyCreatedRecord.fromIP;
    }
    var data = { insert: newlyCreatedRecord };

    // Do not send log-only messages through the socket
    if (newlyCreatedRecord.to !== "log") {
      sails.log.silly(`messages socket: ${data}`);
      sails.sockets.broadcast("messages", "messages", data);
    }

    // If message was a public website message, send to public website socket
    if (newlyCreatedRecord.to === "DJ" || newlyCreatedRecord.to === "website") {
      sails.log.silly(`messages socket for messages-website: ${data}`);
      sails.sockets.broadcast("messages-website", "messages", data);
    }

    // If message was a private website message, send to the respective client's socket. Send a push notification if applicable.
    if (
      newlyCreatedRecord.from.startsWith("website-") &&
      newlyCreatedRecord.to === "DJ-private"
    ) {
      sails.log.silly(
        `messages socket for messages-${newlyCreatedRecord.from}: ${data}`
      );
      sails.sockets.broadcast(
        `messages-${newlyCreatedRecord.from}`,
        "messages",
        data
      );
    }
    if (
      newlyCreatedRecord.to.startsWith("website-") ||
      newlyCreatedRecord.to.startsWith("display-")
    ) {
      sails.log.silly(
        `messages socket for messages-${newlyCreatedRecord.to}: ${data}`
      );
      sails.sockets.broadcast(
        `messages-${newlyCreatedRecord.to}`,
        "messages",
        data
      );
      (async () => {
        var recipient = await sails.models.recipients.findOne({
          host: newlyCreatedRecord.to,
          device: { "!=": null }
        });
        if (recipient) {
          await sails.helpers.onesignal.send(
            [recipient.device],
            `message`,
            `New Message From DJ`,
            breakdance(
              await sails.helpers.truncateText(newlyCreatedRecord.message, 128)
            ),
            60 * 60
          );
        }
      })();
    }

    return proceed();
  },

  afterUpdate: function(updatedRecord, proceed) {
    // Do not pass IP addresses through web sockets!
    if (typeof updatedRecord.fromIP !== "undefined") {
      delete updatedRecord.fromIP;
    }
    var data = { update: updatedRecord };

    if (updatedRecord.status === "deleted") {
      data = { remove: updatedRecord.ID };
    }

    // Do not send log-only messages through the socket
    if (updatedRecord.to !== "log") {
      sails.log.silly(`messages socket: ${data}`);
      sails.sockets.broadcast("messages", "messages", data);
    }

    // If message was a public website message, send to public website socket
    if (updatedRecord.to === "DJ" || updatedRecord.to === "website") {
      sails.log.silly(`messages socket for messages-website: ${data}`);
      sails.sockets.broadcast("messages-website", "messages", data);
    }

    // If message was a private website message, send to the respective client's socket
    if (
      updatedRecord.from.startsWith("website-") &&
      updatedRecord.to === "DJ-private"
    ) {
      sails.log.silly(
        `messages socket for messages-${updatedRecord.from}: ${data}`
      );
      sails.sockets.broadcast(
        `messages-${updatedRecord.from}`,
        "messages",
        data
      );
    }
    if (
      updatedRecord.to.startsWith("website-") ||
      updatedRecord.to.startsWith("display-")
    ) {
      sails.log.silly(
        `messages socket for messages-${updatedRecord.to}: ${data}`
      );
      sails.sockets.broadcast(`messages-${updatedRecord.to}`, "messages", data);
    }

    return proceed();
  },

  afterDestroy: function(destroyedRecord, proceed) {
    // Do not pass IP addresses through web sockets!
    if (typeof destroyedRecord.fromIP !== "undefined") {
      delete destroyedRecord.fromIP;
    }
    var data = { remove: destroyedRecord.ID };
    sails.log.silly(`messages socket: ${data}`);
    sails.sockets.broadcast("messages", "messages", data);

    // If message was a public website message, send to public website socket
    if (destroyedRecord.to === "DJ" || destroyedRecord.to === "website") {
      sails.log.silly(`messages socket for messages-website: ${data}`);
      sails.sockets.broadcast("messages-website", "messages", data);
    }

    // If message was a private website message, send to the respective client's socket
    if (
      destroyedRecord.from.startsWith("website-") &&
      destroyedRecord.to === "DJ-private"
    ) {
      sails.log.silly(
        `messages socket for messages-${destroyedRecord.from}: ${data}`
      );
      sails.sockets.broadcast(
        `messages-${destroyedRecord.from}`,
        "messages",
        data
      );
    }
    if (
      destroyedRecord.to.startsWith("website-") ||
      destroyedRecord.to.startsWith("display-")
    ) {
      sails.log.silly(
        `messages socket for messages-${destroyedRecord.to}: ${data}`
      );
      sails.sockets.broadcast(
        `messages-${destroyedRecord.to}`,
        "messages",
        data
      );
    }

    return proceed();
  }
};
