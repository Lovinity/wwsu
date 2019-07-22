module.exports = {

  friendlyName: `messages.remove`,

  description: `Delete a single message.`,

  inputs: {
    ID: {
      type: `number`,
      required: true,
      description: `The ID number of the message to delete.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper messages.remove called.`)
    try {
      // Mark message as removed. Do not actually destroy it; we want it in the database for archive.
      var records = await sails.models.messages.update({ ID: inputs.ID }, { status: `deleted` })
        .fetch()
      if (!records || records.length === 0) {
        return exits.error(new Error(`The message does not exist.`))
      } else {
        return exits.success()
      }
    } catch (e) {
      return exits.error(e)
    }
  }

}
