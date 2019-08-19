module.exports = {

  friendlyName: 'discipline / add',

  description: 'Add a discipline action to a specified host.',

  inputs: {
    active: {
      type: 'boolean',
      description: 'Whether or not this discipline should be in effect.',
      defaultsTo: true
    },
    IP: {
      type: 'string',
      required: true,
      description: 'Either the IP address or unique host ID of the user to ban.'
    },
    action: {
      type: 'string',
      required: true,
      isIn: ['dayban', 'permaban', 'showban'],
      description: 'Type of ban: dayban (24 hours from createdAt), permaban (indefinite), show ban (until the current broadcast ends).'
    },
    message: {
      type: 'string',
      defaultsTo: `Unspecified Reason`,
      description: 'Reason for the discipline.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`controller discipline/add called.`)

    try {
      // Prevent adding discipline to website visitors if host is lockToDJ and the specified lockToDJ is not on the air
      if (this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj) { return exits.error(new Error('You are not authorized to discipline website visitors because you are not on the air.')) }

      await sails.helpers.discipline.add(inputs.IP, inputs.action, inputs.message, inputs.active)

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
