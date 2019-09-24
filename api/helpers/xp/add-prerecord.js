module.exports = {

  friendlyName: 'xp.addPrerecord',

  description: 'Calculate and add XP for prerecorded shows.',

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper xp.addPrerecord called!`)

    try {
      // Calculate XP if exiting prerecord
      if (sails.models.meta.memory.state.startsWith('prerecord_')) {
        // Close off the current attendance record and calculate statistics.
        var attendance = await sails.helpers.attendance.createRecord()

        // Award XP based on time on the air
        var showXP = Math.round(attendance.updatedRecord.showTime / sails.config.custom.XP.prerecordShowMinutes)

        await sails.models.xp.create({ dj: attendance.dj, type: 'xp', subtype: 'showtime', amount: showXP, description: `Prerecord was on the air for ${attendance.showTime} minutes.` })
          .tolerate((err) => {
            // Do not throw for error, but log it
            sails.log.error(err)
          })

        // Calculate listener minutes
        var listenerXP = Math.round(attendance.updatedRecord.listenerMinutes / sails.config.custom.XP.prerecordListenerMinutes)

        await sails.models.xp.create({ dj: attendance.dj, type: 'xp', subtype: 'listeners', amount: listenerXP, description: `There were ${listenerMinutes} online listener minutes during the prerecord.` })
          .tolerate((err) => {
            // Do not throw for error, but log it
            sails.log.error(err)
          })
      }

      return exits.success()
    } catch (e) {
      // Do not error for errors
      sails.log.error(e)
      return exits.success()
    }
  }

}
