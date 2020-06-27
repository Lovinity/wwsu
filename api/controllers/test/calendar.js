module.exports = {

  friendlyName: 'Calendar',

  description: 'Calendar test.',

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    return exits.success({ 
      whatShouldBePlaying: sails.models.calendar.calendardb.whatShouldBePlaying(null, true), 
      getEvents: sails.models.calendar.calendardb.getEvents(null),
      calendarDb: sails.models.calendar.calendardb.calendar.db(),
      scheduleDb: sails.models.calendar.calendardb.schedule.db(),
      clockwheelsDb: sails.models.calendar.calendardb.clockwheels.db(),
     });
  }

}
