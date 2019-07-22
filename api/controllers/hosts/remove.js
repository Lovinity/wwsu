var sh = require(`shorthash`)

module.exports = {

  friendlyName: `hosts / remove`,

  description: `Remove a host from the database.`,

  inputs: {
    ID: {
      type: `number`,
      required: true,
      description: `The ID of the director to edit.`
    }
  },

  exits: {
    conflict: {
      statusCode: 409
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller hosts/remove called.`)

    try {
      // First, determine if we need to lock out of editing authorized and admin
      var lockout = await sails.models.hosts.count({ authorized: true, admin: true })

      var toDestroy = await sails.models.hosts.find({ ID: inputs.ID })

      // Block requests to remove this host if there are 1 or less authorized admin hosts and this host is an authorized admin.
      if (lockout <= 1 && toDestroy.authorized && toDestroy.admin) { return exits.conflict(`To prevent accidental lockout, this request was denied because there are 1 or less authorized admin hosts. Make another host an authorized admin first before removing this host.`) }

      // Destroy it
      var hostRecord = await sails.models.hosts.destroyOne({ ID: inputs.ID })

      // Destroy the status records for this host as well
      await sails.models.status.destroy({ name: `host-${sh.unique(hostRecord.host + sails.config.custom.hostSecret)}` }).fetch()

      // All done.
      return exits.success()
    } catch (e) {
      return sails.error(e)
    }
  }

}
