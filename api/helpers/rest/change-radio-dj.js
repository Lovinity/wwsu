module.exports = {

  friendlyName: 'helper rest.changeRadioDj',

  description: 'Change which RadioDJ instance is the active one.',

  inputs: {
    instance: {
      type: 'string',
      description: 'The REST address to the RadioDJ that should be activated. If not specified, one will be chosen from a list of good-status RadioDJs.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper sails.helpers.rest.changeRadioDj called.`)
    try {
      // Determine which inactive RadioDJs are healthy (status 5).
      var healthyRadioDJs = []
      var maps = sails.config.custom.radiodjs.map(async (instance) => {
        if (instance.rest === sails.models.meta.memory.radiodj) { return false }
        var status = await sails.models.status.findOne({ name: `radiodj-${instance.name}` })
        if (status && status.status === 5) { healthyRadioDJs.push(instance) }
        return true
      })
      await Promise.all(maps)

      // If there is at least one healthy inactive RadioDJ, choose one randomly to switch to
      if (healthyRadioDJs.length > 0) {
        var changeTo = await sails.helpers.pickRandom(healthyRadioDJs)
        // Overwrite randomly chosen RadioDJ if one was specified
        if (inputs.instance)
          changeTo = { item: { rest: inputs.instance } };
        await sails.helpers.meta.change.with({ radiodj: changeTo.item.rest })

        // Otherwise, check to see if the active RadioDJ is still status 5
      } else {
        maps = sails.config.custom.radiodjs
          .filter((instance) => instance.rest === sails.models.meta.memory.radiodj)
          .map(async (instance) => {
            var status = await sails.models.status.findOne({ name: `radiodj-${instance.name}` })
            // If the current RadioDJ is also not status 5, we have a huge problem! Trigger critical status, and wait for a good RadioDJ to report
            if (!status || status.status !== 5) {
              sails.models.status.errorCheck.waitForGoodRadioDJ = true
              await sails.helpers.status.change.with({ name: `radiodj-${instance.name}`, label: `RadioDJ ${instance.label}`, status: 1, data: `None of the configured RadioDJs are operational! System is waiting for one to report online. Please ensure RadioDJ is running and the REST server is online, configured properly, and accessible. You may have to play a track in RadioDJ before REST begins working.` })
              await sails.helpers.onesignal.sendMass('emergencies', 'No operational RadioDJ instances!', `On ${moment().format('LLLL')}, the system ran into a condition where there were no operational RadioDJs. Dead air was likely and may be still occurring. Please ensure at least 1 RadioDJ is functional immediately.`)
              // Throw an error so that error.post does not get called, which is sometimes called after this helper finishes.
              throw new Error(`There are no healthy RadioDJ instances to switch to at this time.`)
            }
            return true
          })
        await Promise.all(maps)
      }

      // All done.
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
