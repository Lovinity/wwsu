module.exports = {

    friendlyName: 'songs/sort-new-path',

    description: 'Sorting application should send new paths to this endpoint for changing in RadioDJ',

    inputs: {
        paths: {
            type: 'json',
            required: true,
            custom: (value) => {
                if (!_.isArray(value)) { return false }
                if (value.length < 1) { return true }

                var valid = true
                value.map((val) => {
                    if (!valid) { return null }

                    if (typeof val !== 'object') {
                        valid = false
                        return null
                    }

                    if (typeof val.ID === `undefined` || typeof val.newPath === `undefined`) {
                        valid = false
                        return null
                    }
                })

                return valid
            }
        }
    },

    fn: async function (inputs, exits) {
        sails.log.debug('Controller songs/sort-new-path called.')

        try {

            if (inputs.paths.length > 0) {
                inputs.paths.map((map) => {
                    (async (ID2, newPath2) => {
                        await sails.models.songs.update({ ID: ID2 }, { path: newPath2 })
                    })(map.ID, map.newPath)
                })
            }

            return exits.success()
        } catch (e) {
            return exits.error(e)
        }
    }

}