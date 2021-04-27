/**
 * calendar.js
 *
 * @description :: Calendar events.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: "nodebase",
  attributes: {
    ID: {
      type: "number",
      autoIncrement: true,
    },

    type: {
      type: "string",
      isIn: [
        "show",
        "sports",
        "remote",
        "prerecord",
        "genre",
        "playlist",
        "event",
        "onair-booking",
        "prod-booking",
        "office-hours",
      ],
      defaultsTo: "event",
    },

    active: {
      type: "boolean",
      defaultsTo: true,
    },

    priority: {
      type: "number",
      allowNull: true,
    },

    hostDJ: {
      type: "number",
      allowNull: true,
    },

    cohostDJ1: {
      type: "number",
      allowNull: true,
    },

    cohostDJ2: {
      type: "number",
      allowNull: true,
    },

    cohostDJ3: {
      type: "number",
      allowNull: true,
    },

    eventID: {
      type: "number",
      allowNull: true,
    },

    playlistID: {
      type: "number",
      allowNull: true,
    },

    director: {
      type: "number",
      allowNull: true,
    },

    hosts: {
      type: "string",
      allowNull: true,
    },

    name: {
      type: "string",
      allowNull: true,
    },

    description: {
      type: "string",
      allowNull: true,
    },

    logo: {
      type: "string",
      allowNull: true,
    },

    banner: {
      type: "string",
      allowNull: true,
    },

    discordChannel: {
      type: "string",
      allowNull: true,
    },

    discordCalendarMessage: {
      type: "string",
      allowNull: true,
    },

    discordScheduleMessage: {
      type: "string",
      allowNull: true,
    },
  },

  calendardb: undefined,

  // Websockets standards
  afterCreate: function (newlyCreatedRecord, proceed) {
    var data = { insert: newlyCreatedRecord };
    sails.models.calendar.calendardb.query("calendar", data);
    sails.log.silly(`calendar socket: ${data}`);
    sails.sockets.broadcast("calendar", "calendar", data);

    var temp;
    temp = (async () => {
      var event = sails.models.calendar.calendardb.processRecord(
        newlyCreatedRecord,
        {},
        moment().toISOString(true)
      );
      await sails.helpers.discord.calendar.postEvent(event);
    })();
    return proceed();
  },

  afterUpdate: function (updatedRecord, proceed) {
    var temp;

    var data = { update: updatedRecord };
    if (!updatedRecord.active) data = { remove: updatedRecord.ID };

    sails.models.calendar.calendardb.query("calendar", data);
    sails.log.silly(`calendar socket: ${data}`);
    sails.sockets.broadcast("calendar", "calendar", data);

    // If setting active to false, treat as deletion in web sockets and delete all schedules and notify subscribers of a discontinued show
    temp = (async () => {
      var event = sails.models.calendar.calendardb.processRecord(
        updatedRecord,
        {},
        moment().toISOString(true)
      );
      if (!updatedRecord.active) {
        await sails.models.schedule
          .destroy({ calendarID: updatedRecord.ID })
          .fetch();
      } else {
        await sails.helpers.discord.calendar.postEvent(event);
      }
      await sails.helpers.onesignal.sendEvent(event, false, false);
      await sails.helpers.discord.sendSchedule(
        event,
        updatedRecord,
        false,
        false
      );
    })();

    return proceed();
  },

  afterDestroy: function (destroyedRecord, proceed) {
    var data = { remove: destroyedRecord.ID };
    sails.models.calendar.calendardb.query("calendar", data);
    sails.log.silly(`calendar socket: ${data}`);
    sails.sockets.broadcast("calendar", "calendar", data);
    var temp;

    // Remove all calendar schedules
    temp = (async () => {
      await sails.models.schedule
        .destroy({ calendarID: destroyedRecord.ID })
        .fetch();
      var event = sails.models.calendar.calendardb.processRecord(
        destroyedRecord,
        {},
        moment().toISOString(true)
      );
      await sails.helpers.onesignal.sendEvent(event, false, false);
      await sails.helpers.discord.sendSchedule(
        event,
        destroyedRecord,
        false,
        false
      );
    })();

    return proceed();
  },
};
