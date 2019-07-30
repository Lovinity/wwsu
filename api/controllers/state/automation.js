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
      if (sails.models.meta['A'].changingState !== null) { return exits.error(new Error(`The system is in the process of changing states. The request was blocked to prevent clashes.`)) }

      // Lock system from any other state changing requests until we are done.
      await sails.models.meta.changeMeta({ changingState: `Changing to automation / calculating show stats` })
      return sails.helpers.state.automation(inputs.transition)
    } catch (e) {
      await sails.models.meta.changeMeta({ changingState: null })
      return exits.error(e)
    }
  }

}
