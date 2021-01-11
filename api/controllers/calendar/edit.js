module.exports = {
  friendlyName: "Calendar / Edit",

  description: "Edit a main calendar event.",

  inputs: {
    ID: {
      required: true,
      type: "number"
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
        "office-hours"
      ]
    },

    active: {
      type: "boolean"
    },

    priority: {
      type: "number",
      allowNull: true
    },

    hostDJ: {
      type: "number",
      allowNull: true
    },

    cohostDJ1: {
      type: "number",
      allowNull: true
    },

    cohostDJ2: {
      type: "number",
      allowNull: true
    },

    cohostDJ3: {
      type: "number",
      allowNull: true
    },

    eventID: {
      type: "number",
      allowNull: true
    },

    playlistID: {
      type: "number",
      allowNull: true
    },

    director: {
      type: "number",
      allowNull: true
    },

    name: {
      type: "string",
      allowNull: true
    },

    description: {
      type: "string",
      allowNull: true
    },

    logo: {
      type: "string",
      allowNull: true
    },

    banner: {
      type: "string",
      allowNull: true
    }
  },

  fn: async function(inputs) {
    sails.log.debug("Controller calendar/add called.");
    // Verify the event
    var event = {
      ID: inputs.ID,
      type: inputs.type ? inputs.type : undefined,
      active: inputs.active ? inputs.active : undefined,
      priority: inputs.priority ? inputs.priority : undefined,
      hostDJ: inputs.hostDJ ? inputs.hostDJ : undefined,
      cohostDJ1: inputs.cohostDJ1 ? inputs.cohostDJ1 : undefined,
      cohostDJ2: inputs.cohostDJ2 ? inputs.cohostDJ2 : undefined,
      cohostDJ3: inputs.cohostDJ3 ? inputs.cohostDJ3 : undefined,
      eventID: inputs.eventID ? inputs.eventID : undefined,
      playlistID: inputs.playlistID ? inputs.playlistID : undefined,
      director: inputs.director ? inputs.director : undefined,
      name: inputs.name ? inputs.name : undefined,
      description: inputs.description ? inputs.description : undefined,
      logo: inputs.logo ? inputs.logo : undefined,
      banner: inputs.banner ? inputs.banner : undefined
    };

    // Get the original calendar record
    var calendar = await sails.models.calendar.findOne({ ID: inputs.ID });
    if (!calendar) return "No calendar record with that ID exists.";

    // Polyfill main calendar info with edits requested
    var tempCal = {};
    for (var stuff in calendar) {
      if (Object.prototype.hasOwnProperty.call(calendar, stuff)) {
        if (typeof calendar[stuff] !== "undefined" && calendar[stuff] !== null)
          tempCal[stuff] = calendar[stuff];
      }
    }
    for (var stuff in event) {
      if (Object.prototype.hasOwnProperty.call(event, stuff)) {
        if (typeof event[stuff] !== "undefined" && event[stuff] !== null)
          tempCal[stuff] = event[stuff];
      }
    }

    // Verify the edits
    try {
      event = await sails.helpers.calendar.verify(tempCal);
    } catch (e) {
      return e.message;
    }

    // Check for event conflicts
    sails.models.calendar.calendardb.checkConflicts(
      async conflicts => {
        // Remove records which should be removed first
        if (conflicts.removals.length > 0) {
          await sails.models.schedule
            .destroy({
              ID: conflicts.removals.map(removal => removal.scheduleID)
            })
            .fetch();
        }

        // Now, add overrides
        if (conflicts.additions.length > 0) {
          let cfMaps = conflicts.additions.map(async override => {
            await sails.models.schedule.create(override).fetch();
          });
          await Promise.all(cfMaps);
        }
      },
      [{ updateCalendar: event }]
    );

    // Edit the event into the calendar
    await sails.models.calendar.updateOne({ ID: inputs.ID }, event);
  }
};
