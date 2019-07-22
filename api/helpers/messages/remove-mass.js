module.exports = {

  friendlyName: `messages.removeMass`,

  description: `Mass delete all messages sent by a specified host.`,

  inputs: {
    host: {
      required: true,
      type: `string`,
      description: `The unique ID assigned to the host that we are deleting message.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper messages.removeMass called.`)
    try {
      // Mark all messages from provided host as deleted
      await sails.models.messages.update({ from: inputs.host }, { status: `deleted` }).fetch()
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
