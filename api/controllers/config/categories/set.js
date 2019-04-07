/* global Calendar, sails, Directorhours, _ */

module.exports = {

    friendlyName: 'config / categories / set',

    description: 'Add or update a RadioDJ category item.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            isNotIn: [`_doNotRemove`],
            description: `The name of the category to add, or add to`
        },

        config: {
            type: 'json',
            custom: (value) => {
              var isValid = true;
              for (var key in value)
              {
                  if (value.hasOwnProperty(key))
                  {
                      // The value of every key should be an array.
                      if (!_.isArray(value[key]))
                        isValid = false;
                    
                      if (value[key].length > 0)
                      {
                          // Every item in the array should be a string
                          value[key].map((item) => {
                             if (!_.isString(item))
                                 isValid = false;
                          });
                      }
                  }
              }
              return isValid;
            },
            description: `JSON configuration of RadioDJ categories/subcategories to use for this category. Each key is a RadioDJ main category. Each value is an array of subcategories in the main category; use an empty array to use all subcategories.`,
            defaultsTo: {}
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/categories/set called.');

        try {
            sails.config.custom.categories[inputs.name] = inputs.config;
            
            sails.sockets.broadcast('config', 'config', {update: {categories: sails.config.custom.categories}});

            // Reload subcategories in configuration
            await sails.helpers.songs.reloadSubcategories();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


