module.exports = {

  friendlyName: 'config / breaks / set-live',

  description: 'Set what is queued during breaks when in a live broadcast.',

  inputs: {
    start: {
      type: 'json',
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are queued/executed just before a live show begins.`
    },
    before: {
      type: 'json',
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are queued/executed once, right when the break is started.`
    },
    during: {
      type: 'json',
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are executed/queued repeatedly every time RadioDJ's queue gets empty until the DJ returns from their break.`
    },
    after: {
      type: 'json',
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are queued/executed when the DJ returns from their break.`
    },
    end: {
      type: 'json',
      custom: (value) => sails.helpers.break.validate(value),
      description: `These break tasks are queued/executed when the live show ends.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/breaks/set-live called.')

    // Modify config
    try {
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom.specialBreaks.live[key] = inputs[key]
        }
      }

      // Send new config through sockets
      sails.sockets.broadcast('config', 'config', { update: { specialBreaks: sails.config.custom.specialBreaks } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
