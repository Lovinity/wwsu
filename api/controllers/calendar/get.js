module.exports = {
  friendlyName: "Calendar / Get",

  description:
    "Get all calendar events to use in CalendarDb. Also subscribe to sockets.",

  inputs: {},

  fn: async function(inputs) {
    sails.log.debug("Controller calendar/get called.");
    // Grab only active events
    var calendarRecords = await sails.models.calendar.find({ active: true });

    // Subscribe to sockets if applicable
    if (this.req.isSocket) {
      sails.sockets.join(this.req, "calendar");
      sails.log.verbose("Request was a socket. Joining calendar.");
    }

    return calendarRecords;
  }
};
