module.exports = {

  friendlyName: 'config / categories / set',

  description: 'Add or update a RadioDJ category item.',

  inputs: {
    name: {
      type: 'string',
      required: true,
      regex: /^[a-z0-9]+$/i,
      isNotIn: [`_doNotRemove`],
      description: `The name of the category to add or edit. Alphanumeric names only are allowed.`
    },

    config: {
      type: 'json',
      custom: (value) => {
        var isValid = true
        for (var key in value) {
          if (Object.prototype.hasOwnProperty.call(value, key)) {
            // The value of every key should be an array.
            if (!_.isArray(value[key])) { isValid = false }

            if (value[key].length > 0) {
              // Every item in the array should be a string
              value[key].map((item) => {
                if (!_.isString(item)) { isValid = false }
              })
            }
          }
        }
        return isValid
      },
      description: `JSON configuration of RadioDJ categories/subcategories to use for this category. Each key is a RadioDJ main category. Each value is an array of subcategories in the main category; use an empty array to use all subcategories.`,
      defaultsTo: {}
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/categories/set called.')

    try {
      // Do not modify _doNotRemove category
      if (inputs.name === `_doNotRemove`) { return exits.error(new Error(`_doNotRemove is a restricted category and cannot be modified.`)) }

      sails.config.custom.categories[inputs.name] = inputs.config

      sails.sockets.broadcast('config', 'config', { update: { categories: sails.config.custom.categories } })

      // Reload subcategories in configuration
      await sails.helpers.songs.reloadSubcategories()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
