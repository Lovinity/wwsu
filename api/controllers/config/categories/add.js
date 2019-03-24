/* global Calendar, sails, Directorhours, _ */

module.exports = {

    friendlyName: 'config / categories / add',

    description: 'Add or update a RadioDJ category item.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            description: `The name of the category to add, or add to`
        },

        category: {
            type: 'string',
            description: `The name of the main RadioDJ category to add in, or replace if it already exists in the configuration.`
        },

        subcategories: {
            type: 'json',
            custom: (value) => _.isArray(value),
            description: `An array of RadioDJ subcategories that should be used within the specified category. Omit or use [] for all subcategories.`,
            defaultsTo: []
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/categories/add called.');

        try {
            if (inputs.name === `_doNotRemove`)
                return exits.error(new Error(`Not allowed to change the restricted category ${inputs.name}.`));
            
            
            if (inputs.name && typeof sails.config.custom.categories[inputs.name] === `undefined`)
            {
                sails.config.custom.categories[inputs.name] = {};
            }

            if (inputs.category)
                sails.config.custom.categories[inputs.name][inputs.category] = inputs.subcategories;
            
            sails.sockets.broadcast('config', 'config', {update: {categories: sails.config.custom.categories}});

            // Reload subcategories in configuration
            await sails.helpers.songs.reloadSubcategories();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};


