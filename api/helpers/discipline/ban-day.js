module.exports = {

  friendlyName: 'discipline.banDay',

  description: 'Ban a specified host for 24 hours.',

  inputs: {
    host: {
      required: true,
      type: 'string',
      description: 'The unique ID assigned to the host that we are banning.'
    },

    message: {
      type: 'string',
      defaultsTo: 'Unspecified reason',
      description: 'The reason for issuing the discipline'
    },

    active: {
      type: 'boolean',
      defaultsTo: true,
      description: 'whether or not the discipline should be active when created.'
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Helper discipline.banDay called.')
    sails.log.silly(`Parameters passed: ${JSON.stringify(inputs)}`)
    try {
      // Remove all messages by the user
      await sails.helpers.messages.removeMass(inputs.host)

      // Add a dayban to the database
      var reference = await sails.models.discipline.create({ active: inputs.active, IP: inputs.host, action: 'dayban', message: inputs.message }).fetch()

      // Broadcast the ban to the client
      sails.sockets.broadcast(`discipline-${inputs.host.replace('website-', '')}`, 'discipline', { discipline: `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${reference.ID}` })
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
