module.exports = {

  friendlyName: 'helper rest.changeRadioDj',

  description: 'Change which RadioDJ instance is the active one.',

  inputs: {

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
              await sails.models.announcements.findOrCreate({ type: 'djcontrols', title: `RadioDJ Outage (system)` }, { type: 'djcontrols', level: 'warning', title: `RadioDJ Outage (system)`, announcement: `On ${moment().format('LLLL')}, the system ran into a condition where there were no operational RadioDJs. When this happens, dead air is likely. This is usually caused by a network outage on all computers or the Node server, or when there are no backup RadioDJs to take over a failure. Please check the logs for more info, and delete this announcement under admin menu -> Manage Announcements when the issue is considered resolved.`, starts: moment().toISOString(true), expires: moment({ year: 3000 }).toISOString(true) })
                .tolerate((err) => {
                  sails.log.error(err)
                })
              await sails.helpers.onesignal.sendMass('emergencies', 'WWSU - RadioDJ offline!', `On ${moment().format('LLLL')}, the system ran into a condition where there were no operational RadioDJs. Dead air was likely and may be still occurring. Please ensure at least 1 RadioDJ is functional immediately.`)
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
