module.exports = {

  friendlyName: `state/change-radio-dj`,

  description: `Switch which radioDJ is currently active.`,

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller state/change-radio-dj called.`)

    try {
      // Lock state change
      await sails.models.meta.changeMeta({ changingState: `Switching radioDJ instances` })

      // Try to stop the current automation, then switch to another and execute post error tasks to get it going
      await sails.helpers.rest.cmd(`EnableAssisted`, 1, 0)
      await sails.helpers.rest.cmd(`EnableAutoDJ`, 1, 0)
      await sails.helpers.rest.cmd(`StopPlayer`, 0, 0)
      var queue = sails.models.meta.automation
      await sails.helpers.rest.changeRadioDj()
      await sails.helpers.rest.cmd(`ClearPlaylist`, 1)
      await sails.helpers.error.post(queue)

      await sails.models.meta.changeMeta({ changingState: null })
      return exits.success()
    } catch (e) {
      await sails.models.meta.changeMeta({ changingState: null })
      return exits.error(e)
    }
  }

}
