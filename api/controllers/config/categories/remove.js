/* global Calendar, sails, Directorhours, _ */

module.exports = {

    friendlyName: 'config / categories / remove',

    description: 'Remove a category from configuration.',

    inputs: {
        name: {
            type: 'string',
            required: true,
            description: `The name of the category to remove.`
        },
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller config/categories/remove called.');

        try {
            
            if (inputs.name === `_doNotRemove` || sails.config.custom.categories._doNotRemove.indexOf(inputs.name) !== -1)
                return exits.error(new Error(`Not allowed to remove the provided category ${inputs.name} from the system.`));
            
            delete sails.config.custom.categories[inputs.name];
            
            sails.sockets.broadcast('config', 'config', {update: {categories: sails.config.custom.categories}});

            // Reload subcategories in configuration
            await sails.helpers.songs.reloadSubcategories();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};



