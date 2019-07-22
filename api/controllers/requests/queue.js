module.exports = {

  friendlyName: 'Requests / Queue',

  description: 'Queue or play a request.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The Request ID number.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller requests/queue called.')

    try {
      // Queue the request
      var response = await sails.helpers.requests.queue(1, false, false, inputs.ID)

      // Return true if the request was queued, false if it was not
      return exits.success(response)
    } catch (e) {
      return exits.error(e)
    }
  }

}
