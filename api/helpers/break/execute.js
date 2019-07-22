module.exports = {

  friendlyName: `break.execute`,

  description: `Execute a configured break object.`,

  inputs: {
    task: {
      type: `string`,
      required: true,
      description: `Name of the break task to execute.`
    },
    event: {
      type: `string`,
      defaultsTo: ``,
      description: `For log tasks, the event to log.`
    },
    category: {
      type: `string`,
      description: `For queue tasks, the configured config.custom.categories to queue tracks from.`
    },
    quantity: {
      type: `number`,
      defaultsTo: 1,
      description: `For tasks involving queuing of tracks or requests, number of tracks to queue.`
    },
    rules: {
      type: `boolean`,
      defaultsTo: false,
      description: `For track queuing, If true, follow playlist rotation rules. Defaults to false.`
    }
  },

  exits: {
    success: {
      description: `All done.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper requests.get called.`)

    try {
      switch (inputs.task) {
        // Log an entry
        case `log`:
          await sails.models.logs.create({ attendanceID: sails.models.meta[`A`].attendanceID, logtype: `break`, loglevel: `info`, logsubtype: `automation`, event: `<strong>${inputs.event}</strong>` }).fetch()
            .tolerate(() => {
            })
          break
          // Add requested tracks
        case `queueRequests`:
          await sails.helpers.requests.queue(inputs.quantity, true, true)
          break
          // Queue tracks from a configured categories.category
        case `queue`:
          await sails.helpers.songs.queue(sails.config.custom.subcats[inputs.category], `Top`, inputs.quantity, inputs.rules, null)
          break
          // Re-queue any underwritings etc that were removed due to duplicate track checking
        case `queueDuplicates`:
          await sails.helpers.songs.queuePending()
          break
          // Queue underwritings scheduled to air
        case `queueUnderwritings`:
          await sails.helpers.break.addUnderwritings(false, inputs.quantity)
          break
      }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
