module.exports = {

  friendlyName: 'config / radiodjs / remove',

  description: 'Remove a RadioDJ from the system and stop using it.',

  inputs: {
    name: {
      type: 'string',
      required: true,
      regex: /^[a-z0-9]+$/i,
      description: 'The name of the RadioDJ to remove from the system.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/radiodjs/remove called.')

    try {
      // If the currently active radioDJ has been removed from the system, we need to trigger a radiodj instance change (after the new configuration is saved).
      var changeRadioDj = false
      sails.config.custom.radiodjs
        .filter((radiodj) => radiodj.rest === sails.models.meta['A'].radiodj && radiodj.name === inputs.name)
        .map(() => { changeRadioDj = true })

      // Delete the RadioDJ
      sails.config.custom.radiodjs
        .filter((radiodj) => radiodj.name === inputs.name)
        .map((radiodj, index) => {
          delete sails.config.custom.radiodjs[index];
          // Remove the status record for this RadioDJ
          (async () => sails.models.status.destroy({ name: `radiodj-${radiodj.name}` }))()
        })

      if (changeRadioDj) {
        // Forcefully clear the current active radioDJ since it no longer exists in configuration.
        await sails.models.meta.changeMeta({ radiodj: '' })

        await sails.helpers.rest.changeRadioDj()
      }

      // Transmit new config over websockets
      sails.sockets.broadcast('config', 'config', { update: { radiodjs: sails.config.custom.radiodjs } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
