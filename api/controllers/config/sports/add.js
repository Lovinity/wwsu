module.exports = {

  friendlyName: 'config / sports / add',

  description: 'Add a configured sport.',

  inputs: {
    name: {
      type: 'string',
      required: true,
      description: 'The name of the sport to add.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/sports/add called.')

    try {
      if (sails.config.custom.sports.indexOf(inputs.name) === -1) {
        sails.config.custom.sports.push(inputs.name)
        sails.sockets.broadcast('config', 'config', { update: { sports: sails.config.custom.sports } })

        // Reload subcategories in configuration
        await sails.helpers.songs.reloadSubcategories()
      }

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
