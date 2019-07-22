module.exports = {

  friendlyName: 'error.count helper',

  description: 'Count up an error. If a trigger is reached, execute its sails.models.status.errorCheck function.',

  inputs: {
    name: {
      type: 'string',
      required: true,
      custom: function (value) {
        if (typeof sails.models.status.errorCheck[value] === 'object' && typeof sails.models.status.errorCheck[value].fn === 'function') { return true }
        return false
      },
      description: 'Name of the sails.models.status.errorCheck key to count.'
    },

    ignoreZero: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, count will not count if the counter is at zero.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper error.count called.')

    try {
      // If the error count is zero and ignoreZero is specified, exit.
      if (sails.models.status.errorCheck[inputs.name].count === 0 && inputs.ignoreZero) {
        return exits.success()
      }

      // If the condition function exists and returns true, reset the error count to 0 and exit.
      if (typeof sails.models.status.errorCheck[inputs.name].condition === 'function' && await sails.models.status.errorCheck[inputs.name].condition()) {
        sails.log.verbose(`Condition met. Error check reset to zero.`)
        await sails.helpers.error.reset(inputs.name)
        return exits.success()
      }

      // The active property ensures we are not actively processing this error already so that we don't execute an error trigger over another one.
      if (!sails.models.status.errorCheck[inputs.name].active) {
        // Bump the count.
        sails.models.status.errorCheck[inputs.name].count++
        sails.log.verbose(`Count now at ${sails.models.status.errorCheck[inputs.name].count}`)

        // If the count is above or equal to the trigger value, trigger the error and reset the count to the trigger function's resolved number.
        if (sails.models.status.errorCheck[inputs.name].count >= sails.models.status.errorCheck[inputs.name].trigger) {
          try {
            sails.log.warn(`sails.models.status.errorCheck.${inputs.name} triggered!`)
            sails.models.status.errorCheck[inputs.name].active = true
            sails.models.status.errorCheck[inputs.name].count = await sails.models.status.errorCheck[inputs.name].fn()
            sails.models.status.errorCheck[inputs.name].active = false
            sails.models.status.errorCheck.prevError = moment()
          } catch (unusedE) {
            sails.models.status.errorCheck[inputs.name].count = sails.models.status.errorCheck[inputs.name].trigger
          }
        }
      }

      // All done.
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
