/* global Calendar, sails, Directorhours */

module.exports = {

  friendlyName: `config / google / set`,

  description: `Set GoogleAPI configuration`,

  inputs: {
    calendarId: {
      type: `string`,
      description: `ID of the Google Calendar used for show programming and WWSU events. Must have API access. NOTE: Events in this calendar should follow proper formatting as documented. WARNING: Changing this value will destroy all existing events in memory and replace it with what is in the new calendar.`
    },

    directorHoursId: {
      type: `string`,
      description: `ID of the Google Calendar containing the office hours for directors. Must have API access. NOTE: Every event in this calendar should have its title as the name of the director the hours are for, as used on the system. WARNING: Changing this value will destroy all existing office hours in memory and replace it with what is in the new calendar.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller config/google/set called.`)

    try {
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom.GoogleAPI[key] = inputs[key]

          // Destroy existing data whenever API keys are changed
          if (key === `calendarId`) { await Calendar.destroy({}).fetch() }
          if (key === `directorHoursId`) { await Directorhours.destroy({}).fetch() }
        }
      }

      // Refresh the calendars
      Calendar.preLoadEvents()

      // broadcast changes over websockets
      sails.sockets.broadcast(`config`, `config`, { update: inputs })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
