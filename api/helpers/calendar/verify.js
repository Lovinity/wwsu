module.exports = {
  friendlyName: "calendar.verify",

  description: "Verify calendar events and schedules.",

  inputs: {
    event: {
      type: "json",
      required: true
    }
  },

  fn: async function(inputs, exits) {
    // Check for proper event formatting
    var event = sails.models.calendar.calendardb.verify(inputs.event);
    if (!event) {
      return exits.error("Event is invalid.");
    } else if (typeof event === "string") {
      return exits.error(event);
    }

    // Populate DJ Names
    try {
      if (
        !inputs.event.scheduleType ||
        inputs.event.scheduleType === null ||
        inputs.event.hostDJ !== null ||
        inputs.event.cohostDJ1 !== null ||
        inputs.event.cohostDJ2 !== null ||
        inputs.event.cohostDJ3 !== null ||
        inputs.event.director !== null
      ) {
        event.event.hosts = await sails.helpers.calendar.generateHosts(
          event.tempCal
        );
      } else {
        event.event.hosts = null;
      }
    } catch (e) {
      return exits.error(e.message);
    }

    // Check for prerequisites depending on event type
    switch (event.tempCal.type) {
      case "sports":
        var summary = event.tempCal.name;
        var summary2;
        if (summary.indexOf(" vs.") > -1) {
          summary = summary.split(" vs.");
          summary2 = summary[1];
          summary = summary[0];
        }
        if (sails.config.custom.sports.indexOf(summary) === -1)
          return exits.error(
            "The provided sport name does not exist in the system."
          );

        event.event.name = summary;
        if (
          summary2 &&
          (!event.tempCal.description || event.tempCal.description === null)
        )
          event.event.description = `${summary} takes on ${summary2}`;
        break;
      case "prerecord":
        var playlist = await sails.models.playlists.findOne({
          ID: event.tempCal.playlistID
        });
        if (!playlist)
          return exits.error("The provided playlist ID does not exist.");
        break;
      case "show":
      case "remote":
      case "prod-booking":
      case "onair-booking":
        var finder = await sails.models.djs.findOne({
          ID: event.tempCal.hostDJ
        });
        if (!finder)
          return exits.error("The provided host DJ ID does not exist.");
        break;
      case "genre":
        var rotation = await sails.models.events.findOne({
          ID: event.tempCal.eventID
        });
        if (!rotation)
          return exits.error(
            "A RadioDJ event with the provided ID does not exist."
          );
        if (rotation.enabled !== "True")
          return exits.error(
            "The provided radioDJ event is not enabled. Please enable it first."
          );
        if (!rotation.data.includes("Load Rotation"))
          return exits.error(
            `The provided radioDJ event does not contain a "Load Rotation" action. This is required to change the genre rotation.`
          );
        break;
      case "office-hours":
        var director = await sails.models.directors.findOne({
          ID: event.tempCal.director
        });
        if (!director)
          return exits.error(`The provided director ID does not exist.`);
        event.event.hosts = director.name;
    }

    return exits.success(event.event);
  }
};
