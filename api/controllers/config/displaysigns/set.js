module.exports = {

  friendlyName: 'config / displaysigns / set',

  description: 'Change the configuration for the display signs',

  inputs: {
    iLevel: {
      type: 'number',
      min: 1,
      max: 5,
      description: `What level should be triggered when there are less than instances number of internal display signs connected? 5 = good, 4 = offline/good, 3 = minor, 2 = significant, 1 = critical.`
    },
    iInstances: {
      type: 'number',
      description: `How many signs should be connected to display/internal for this to be considered good?`
    },
    pLevel: {
      type: 'number',
      min: 1,
      max: 5,
      description: `What level should be triggered when there are less than instances number of public display signs connected? 5 = good, 4 = offline/good, 3 = minor, 2 = significant, 1 = critical.`
    },
    pInstances: {
      type: 'number',
      description: `How many signs should be connected to display/public for this to be considered good?`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/displaysigns/set called.')

    try {
      // Make changes
      sails.config.custom.displaysigns
        .map((sign, index) => {
          if (sign.name === `internal`) {
            if (typeof inputs.iLevel !== `undefined`) { sails.config.custom.displaysigns[index].level = inputs.iLevel }

            if (typeof inputs.iInstances !== `undefined`) { sails.config.custom.displaysigns[index].instances = inputs.iInstances }
          }

          if (sign.name === `public`) {
            if (typeof inputs.pLevel !== `undefined`) { sails.config.custom.displaysigns[index].level = inputs.pLevel }

            if (typeof inputs.pInstances !== `undefined`) { sails.config.custom.displaysigns[index].instances = inputs.pInstances }
          }
        })

      // Add and remove a dummy public display sign recipient so we can update the status according to the new configuration.
      await sails.helpers.recipients.add(`DUMMY`, `display-internal`, 'display', `DUMMY`)
      await sails.helpers.recipients.remove(`DUMMY`, `display-internal`)
      await sails.helpers.recipients.add(`DUMMY`, `display-public`, 'display', `DUMMY`)
      await sails.helpers.recipients.remove(`DUMMY`, `display-public`)

      // broadcast changes over websockets
      sails.sockets.broadcast('config', 'config', { update: { displaysigns: sails.config.custom.displaysigns } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
