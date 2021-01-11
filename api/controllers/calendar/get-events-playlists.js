module.exports = {
  friendlyName: "Calendar / Get-events-playlists",

  description:
    "Get arrays of events and playlists that can be used in calendar selection",

  inputs: {},

  fn: async function(inputs) {
    sails.log.debug("Controller calendar/get-events-playlists called.");
    var events = await sails.models.events.find({
      type: 3,
      data: { contains: "Load Rotation" },
      enabled: "True"
    });
    var playlists = await sails.models.playlists.find();

    return {
      events: events.map(event => {
        return { ID: event.ID, name: event.name };
      }),
      playlists: playlists.map(playlist => {
        return { ID: playlist.ID, name: playlist.name };
      })
    };
  }
};
