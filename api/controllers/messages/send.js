module.exports = {

  friendlyName: `Messages / Send`,

  description: `Send messages from WWSU internal clients.`,

  inputs: {
    to: {
      type: `string`,
      required: true
    },

    to_friendly: {
      type: `string`,
      required: true
    },

    message: {
      type: `string`,
      required: true
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller messages/send called.`)

    try {
      // Send the message
      await sails.helpers.messages.send(this.req.payload.host, inputs.to, inputs.to_friendly, inputs.message)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
