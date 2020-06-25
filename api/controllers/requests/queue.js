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
      // Prevent queuing requests if host is lockToDJ and the specified lockToDJ is not on the air
      if (sails.models.meta.memory.host && this.req.payload.ID !== sails.models.meta.memory.host && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3)
        throw 'forbidden';

      // Queue the request
      var response = await sails.helpers.requests.queue(1, false, false, inputs.ID)

      // Return true if the request was queued, false if it was not
      return exits.success(response)
    } catch (e) {
      return exits.error(e)
    }
  }

}
