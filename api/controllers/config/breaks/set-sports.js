module.exports = {

  friendlyName: `config / breaks / set-sports`,

  description: `Set what is queued during breaks when in a sports broadcast.`,

  inputs: {
    start: {
      type: `json`,
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are queued/executed just before a sports broadcast begins.`
    },
    before: {
      type: `json`,
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are queued/executed once, right when the break is started.`
    },
    during: {
      type: `json`,
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are executed/queued repeatedly every time RadioDJ's queue gets empty until the DJ returns from their break.`
    },
    duringHalftime: {
      type: `json`,
      custom: (value) => sails.helpers.break.validate(value),
      description: `During extended breaks / halftime, these are executed/queued repeatedly every time RadioDJ's queue gets empty until the producer returns from their break.`
    },
    after: {
      type: `json`,
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are queued/executed when the DJ returns from their break.`
    },
    end: {
      type: `json`,
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are queued/executed when the sports broadcast ends.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller config/breaks/set-sports called.`)

    try {
      // Modify config
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom.specialBreaks.sports[key] = inputs[key]
        }
      }

      // Send new config through sockets
      sails.sockets.broadcast(`config`, `config`, { update: { specialBreaks: sails.config.custom.specialBreaks } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
