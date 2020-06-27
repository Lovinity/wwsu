module.exports = {

  friendlyName: 'Calendar',

  description: 'Calendar test.',

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    return exits.success([ sails.models.calendar.calendardb.whatShouldBePlaying(null, true), sails.models.calendar.calendardb.getEvents(null) ]);
  }

}
