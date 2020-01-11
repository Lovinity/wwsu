module.exports = {

  friendlyName: 'calendar.verify',

  description: 'Verify calendar events and exceptions.',

  event: {
    event: {
      type: 'json',
      required: true
    }
  },

  fn: async function (inputs, exits) {

    // Check for proper event formatting
    event = sails.models.calendar.calendardb.verify(inputs.event);
    if (!event) {
      return exits.error("Event is invalid.")
    }

    // Populate DJ Names
    try {
      event.hosts = await sails.helpers.calendar.generateHosts(event);
    } catch (e) {
      return exits.error(e.message);
    }

    // Check for prerequisites depending on event type
    switch (event.type) {
      case 'sports':
        var summary = event.name;
        var summary2;
        if (summary.indexOf(' vs.') > -1) {
          summary2 = summary.substring(summary.indexOf(' vs.'))
          summary = summary.substring(0, summary.indexOf(' vs.'))
        }
        if (sails.config.custom.sports.indexOf(summary) === -1)
          return exits.error("The provided sport name does not exist in the system.");

        event.name = summary;
        if (summary2 && (!event.description || event.description === null))
          event.description = `${summary} takes on ${summary2}`;
        break;
      case 'prerecord':
      case 'genre':
        if (event.type === 'prerecord' && (!event.hostDJ || event.hostDJ === null))
          return exits.error("Prerecords require a host DJ to be specified.");
        var playlist = await sails.models.playlists.findOne({ ID: event.playlistID })
        if (!playlist)
          return exits.error("The provided playlist ID does not exist.");
        event.name = playlist.name;
        break;
      case 'show':
      case 'remote':
      case 'prod-booking':
      case 'onair-booking':
        if (!event.hostDJ || event.hostDJ === null)
          return exits.error("This event type requires a host DJ to be specified.");
        break;
      case 'genre':
        var rotation = await sails.models.events.findOne({ ID: event.eventID });
        if (!rotation)
          return exits.error("A RadioDJ event with the provided name does not exist.");
        if (rotation.enabled !== 'True')
          return exits.error("The provided radioDJ event is not enabled. Please enable it first.");
        if (!rotation.data.includes('Load Rotation'))
          return exits.error(`The provided radioDJ event does not contain a "Load Rotation" action. This is required to change the genre rotation.`);
        event.name = rotation.name;
        break;
      case 'office-hours':
        var director = await sails.models.directors.findOne({ ID: event.director });
        if (!director)
          return exits.error(`The provided director ID does not exist.`);
        event.hosts = director.name;
    }

    return exits.success(event);
  }

}
