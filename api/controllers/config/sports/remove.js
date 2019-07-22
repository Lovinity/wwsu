module.exports = {

  friendlyName: `config / sports / remove`,

  description: `Remove a configured sport.`,

  inputs: {
    name: {
      type: `string`,
      required: true,
      description: `The name of the sport to remove.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller config/sports/remove called.`)

    try {
      if (sails.config.custom.sports.indexOf(inputs.name) !== -1) {
        delete sails.config.custom.sports[sails.config.custom.sports.indexOf(inputs.name)]
        sails.sockets.broadcast(`config`, `config`, { update: { sports: sails.config.custom.sports } })

        // Reload subcategories in configuration
        await sails.helpers.songs.reloadSubcategories()
      }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
