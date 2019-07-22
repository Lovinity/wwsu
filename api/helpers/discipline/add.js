module.exports = {

  friendlyName: `discipline.add`,

  description: `Add a disciplinary action to a specified host.`,

  inputs: {
    host: {
      required: true,
      type: `string`,
      description: `The unique ID assigned to the host that we are banning.`
    },

    action: {
      type: `string`,
      required: true,
      isIn: [`dayban`, `permaban`, `showban`],
      description: `Type of ban: dayban (24 hours from createdAt), permaban (indefinite), show ban (until the current broadcast ends).`
    },

    message: {
      type: `string`,
      defaultsTo: `Unspecified reason`,
      description: `The reason for issuing the discipline`
    },

    active: {
      type: `boolean`,
      defaultsTo: true,
      description: `whether or not the discipline should be active when created.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper discipline.banDay called.`)
    try {
      // Remove all messages by the disciplined user
      await sails.helpers.messages.removeMass(inputs.host)

      // Add discipline to the database
      var reference = await sails.models.discipline.create({ active: inputs.active, IP: inputs.host, action: inputs.action, message: inputs.message }).fetch()

      // Broadcast the ban to the client
      sails.sockets.broadcast(`discipline-${inputs.host.replace(`website-`, ``)}`, `discipline`, { discipline: `Your interactions with WWSU have been placed under review. Please email engineer@wwsu1069.org for further assistance. Please include the following reference number(s) in your email: ${reference.ID}` })
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
