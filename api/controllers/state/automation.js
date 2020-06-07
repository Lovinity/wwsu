module.exports = {

  friendlyName: 'State / Automation',

  description: 'Request to go into automation mode.',

  inputs: {
    transition: {
      type: 'boolean',
      defaultsTo: false,
      description: 'If true, system will go into break mode instead of automation to allow for quick transitioning between radio shows.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller state/automation called.')

    try {
      // Block if we are in the process of changing states
      if (sails.models.meta.memory.changingState !== null) { return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`)) }

      // Prevent state changing if host is lockToDJ and the specified lockToDJ is not on the air
      if (this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3) { return exits.error(new Error('You are not authorized to send the system into automation because you are not on the air.')) }

            // Lock system from any other state changing requests until we are done.
            await sails.helpers.meta.change.with({ changingState: `Changing to automation` })

      // Actually go to automation
      await sails.helpers.state.automation(inputs.transition);

      return exits.success()
    } catch (e) {
      await sails.helpers.meta.change.with({ changingState: null })
      return exits.error(e)
    }
  }

}
