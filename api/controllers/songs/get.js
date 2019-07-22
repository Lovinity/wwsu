module.exports = {

  friendlyName: `songs / get`,

  description: `Get information about a song, or songs. Designed to be used with the track request system. Will also return spin counts and whether or not track can be requested if ID was specified.`,

  inputs: {
    ID: {
      type: `number`,
      allowNull: true,
      description: `If provided, will only return the provided song ID.`
    },
    ignoreNonMusic: {
      type: `boolean`,
      defaultsTo: false,
      description: `If true, tracks that cannot be requested (not in categories.music) will not be returned (ignored if an ID was provided). Defaults to false.`
    },
    ignoreDisabled: {
      type: `boolean`,
      defaultsTo: false,
      description: `If true, no disabled songs will be returned (ignored if an ID was provided). Defaults to false.`
    },
    ignoreSpins: {
      type: `boolean`,
      defaultsTo: false,
      description: `If true, spin data will not be returned (spin data is never returned if ID is not specified). This will increase response time significantly. Defaults to false.`
    },
    search: {
      type: `string`,
      allowNull: true,
      description: `Search by provided artist or title.`
    },
    category: {
      type: `string`,
      custom: (value) => {
        if (typeof sails.config.custom.subcats[value] === `undefined`) { return false }
        return true
      },
      description: `Optionally filter by configured Node music category.`
    },
    subcategory: {
      type: `number`,
      allowNull: true,
      description: `Optionally filter returned songs by provided subcategory ID.`
    },
    genre: {
      type: `number`,
      allowNull: true,
      description: `Optionally filter returned songs by provided genre ID.`
    },
    limit: {
      type: `number`,
      defaultsTo: 50,
      description: `Limit the number of songs returned to this number.`
    },
    skip: {
      type: `number`,
      defaultsTo: 0,
      description: `Skip this number of records in the list.`
    }
  },

  exits: {
    success: {
      statusCode: 200
    },
    notFound: {
      statusCode: 404
    },
    error: {
      statusCode: 500
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Controller songs/get called.`)

    try {
      // Get the client IP address
      var fromIP = await sails.helpers.getIp(this.req)

      var cats = {}
      var queryString = {}
      var songs = []

      // No song ID specified?
      if (typeof inputs.ID === `undefined` || inputs.ID === null) {
        // Find songs in any of the music subcategories, or in the provided subcategory or genre.
        // LINT: id_subcat and id_genre may indicate as not in camel case but IT CANNOT BE CHANGED; this is how it is in the RadioDJ database.
        if (inputs.ignoreNonMusic) { queryString.id_subcat = sails.config.custom.subcats.music }
        if ((typeof inputs.subcategory !== `undefined` && inputs.subcategory !== null) || (typeof inputs.category !== `undefined` && inputs.category !== null)) { queryString.id_subcat = [] }
        if (typeof inputs.subcategory !== `undefined` && inputs.subcategory !== null) { queryString.id_subcat.push(inputs.subcategory) }
        if (typeof inputs.category !== `undefined` && inputs.category !== null && typeof sails.config.custom.subcats[inputs.category] !== `undefined`) { queryString.id_subcat = queryString.id_subcat.concat(sails.config.custom.subcats[inputs.category]) }
        if (typeof inputs.genre !== `undefined` && inputs.genre !== null) { queryString.id_genre = inputs.genre }
        if (inputs.ignoreDisabled) { queryString.enabled = 1 }

        // Filter by search string, if provided
        if (typeof inputs.search !== `undefined` && inputs.search !== null && inputs.search !== ``) { queryString.or = [{ artist: { contains: inputs.search } }, { title: { contains: inputs.search } }] }

        songs = await sails.models.songs.find(queryString).sort([{ artist: `ASC` }, { title: `ASC` }]).skip(inputs.skip).limit(inputs.limit)

        // No songs returned? send "false" to indicate we are at the end of the list.
        if (songs.length === 0) { return exits.success(false) }

        sails.log.verbose(`Songs retrieved records: ${songs.length}`)
      } else {
        sails.log.verbose(`Querying single track ID: ${inputs.ID}`)

        // Find the song matching the defined ID
        queryString = { ID: inputs.ID }
        songs = await sails.models.songs.find(queryString)
        sails.log.verbose(`Songs retrieved records: ${songs.length}`)

        // No record retrieved? Assume we could not find the song.
        if (!songs || typeof songs === `undefined` || songs.length <= 0) { return exits.notFound() }

        // grab RadioDJ categories and put them in memory.
        var cats2 = await sails.models.category.find()
        sails.log.verbose(`Categories retrieved: ${cats2.length}`)
        sails.log.silly(cats2)
        cats2.map(cat => { cats[cat.ID] = cat.name })

        // Add additional data to the song(s), such as request ability, category info, and spin counts.
        var maps = songs.map(async (song, index) => {
          try {
            // Get those subcategories
            var subcats2 = await sails.models.subcategory.findOne({ ID: song.id_subcat })
            sails.log.verbose(`Subcategories retrieved: ${subcats2.length}`)
            sails.log.silly(subcats2)

            songs[index].category = `${cats[subcats2.parentid]} >> ${subcats2.name}` || `Unknown`
            songs[index].request = await sails.helpers.requests.checkRequestable(song.ID, fromIP)

            // Get spin counts from both RadioDJ and manually logged entries by DJs
            if (!inputs.ignoreSpins) { songs[index].spins = await sails.helpers.songs.getSpins(song.ID) }
            return true
          } catch (e) {
            sails.log.error(e)
            return false
          }
        })
        await Promise.all(maps)
      }

      // If songs is undefined at this point, that is an internal error!
      if (typeof songs === `undefined`) { return exits.error(new Error(`Internal error: No songs returned!`)) }

      // grab RadioDJ genres and put them in memory.
      var genres = {}
      var genre = await sails.models.genre.find()
      sails.log.verbose(`Genres retrieved: ${genre.length}`)
      sails.log.silly(genre)
      genre.map(genrea => { genres[genrea.ID] = genrea.name })

      // Add genre data to the songs
      songs.map((song, index) => {
        try {
          if (typeof genres[songs[index].id_genre] !== `undefined`) {
            songs[index].genre = genres[songs[index].id_genre]
          } else {
            songs[index].genre = `Unknown`
          }
        } catch (e) {
          sails.log.error(e)
        }
      })

      return exits.success(songs)
    } catch (e) {
      return exits.error(e)
    }
  }

}
