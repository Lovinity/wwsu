// DEPRECATED
module.exports = {

  friendlyName: 'Discipline / banShow',

  description: 'Issues a ban against a user until the currently live DJ signs off of the air.',

  inputs: {
    host: {
      description: 'The unique ID of the user to ban.',
      type: 'string',
      required: true
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller discipline/ban-show called.')
    try {
      await sails.helpers.discipline.banShow(inputs.host, `Unspecified reason`, true)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
