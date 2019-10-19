module.exports = {

    friendlyName: 'songs/sort-template',

    description: 'Returns all non-problematic songs, as well as categories, subcategories, genres, etc, for automatic sorting.',

    inputs: {
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller songs/sort-template called.')

        try {
            var returnData = { categories: [], subcategories: [], genres: [], songs: [] }

            // First, get all songs with enabled 0 or more
            returnData.songs = await sails.models.songs.find({ enabled: { '>=': 0 } })

            // Next, populate genres
            var temp = await sails.models.genre.find()
            if (temp.length > 0) {
                temp.map((genre) => {
                    returnData.genres.push({ ID: genre.ID, name: genre.name })
                })
            }

            // Next, populate categories
            temp = await sails.models.category.find()
            if (temp.length > 0) {
                temp.map((category) => {
                    returnData.categories.push({ ID: category.ID, name: category.name })
                })
            }

            // Populate subcategories
            temp = await sails.models.subcategory.find()
            if (temp.length > 0) {
                temp.map((subcategory) => {
                    var category = `Unknown Category`
                    returnData.categories
                        .filter((cat) => cat.ID === subcategory.parentid)
                        .map((cat) => category = cat.name)
                    returnData.subcategories.push({ ID: subcategory.ID, category: category, name: subcategory.name })
                })
            }

            return exits.success(returnData)
        } catch (e) {
            return exits.error(e)
        }
    }

}
