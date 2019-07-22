require(`moment-duration-format`)

module.exports = {

  friendlyName: `requests.checkRequestable`,

  description: `Check to see if a track can be requested by the client.`,

  inputs: {
    ID: {
      type: `number`,
      required: true,
      description: `The ID number of the Song to check for request ability.`
    },
    IP: {
      type: `string`,
      required: true,
      description: `The IP address of the client to check for request limits.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper requests.checkRequestable called.`)

    try {
      var d = moment().startOf(`day`).toISOString(true)

      // First, check to see if the client has already exceeded their requests for the day
      var requests = await sails.models.requests.find({ userIP: inputs.IP, requested: { '>=': d } })
      sails.log.verbose(`sails.models.requests made by this IP address today: ${requests.length}`)
      if (requests.length >= sails.config.custom.requests.dailyLimit) {
        sails.log.verbose(`Track cannot be requested: Reached daily request limit.`)
        return exits.success({ requestable: false, message: `You have reached your daily request limit (${sails.config.custom.requests.dailyLimit}). Please check back tomorrow.`, listDiv: `warning`, type: `requestRules` })
      }

      // Next, confirm the track ID actually exists
      var record = await sails.models.songs.findOne({ ID: inputs.ID })
      sails.log.silly(`Song: ${record}`)
      if (typeof record === `undefined`) {
        sails.log.verbose(`Track cannot be requested: song ID not found.`)
        return exits.success({ requestable: false, message: `Internal Error: Unable to find the requested track ID.`, listDiv: `danger`, type: `internal` })
      }

      // Is the track disabled?
      if (record.enabled !== 1) {
        sails.log.verbose(`Track cannot be requested: Track is not enabled.`)
        return exits.success({ requestable: false, message: `You cannot request a disabled track.`, listDiv: `warning`, type: `disabled` })
      }

      // Next, check if the provided track has already been requested and is pending to air
      var requests2 = await sails.models.requests.find({ songID: inputs.ID, played: 0 })
      sails.log.silly(`sails.models.requests of this song that are pending: ${requests2}`)
      if (requests2.length > 0) {
        sails.log.verbose(`Track cannot be requested: it has already been requested and is pending to air.`)
        return exits.success({ requestable: false, message: `This track is already in the request queue and pending to air.`, listDiv: `warning`, type: `inQueue` })
      }

      var inQueue = false
      sails.models.meta.automation
        .filter(track => parseInt(track.ID) === inputs.ID)
        .map(() => { inQueue = true })

      if (inQueue) {
        sails.log.verbose(`Track cannot be requested: Track is in the automation system queue and is pending to air.`)
        return exits.success({ requestable: false, message: `This track is already in the request queue and pending to air.`, listDiv: `warning`, type: `inQueue` })
      }

      var subcat = await sails.models.subcategory.findOne({ ID: record.id_subcat })
      sails.log.silly(`Track subcategory: ${subcat}`)
      var parentcat = await sails.models.category.findOne({ ID: subcat.parentid })
      sails.log.silly(`Track category: ${parentcat}`)

      // Check if the track exists in any of the sails.config.custom.musicCatsN. If not, it cannot be requested.
      if (sails.config.custom.subcats.music.indexOf(subcat.ID) === -1) {
        sails.log.verbose(`Track cannot be requested: Track is not a music track.`)
        return exits.success({ requestable: false, message: `You cannot request a non-music track.`, listDiv: `warning`, type: `nonMusic` })
      }

      // The rest of the checks are based off of track rotation rule settings saved in the database via RadioDJ
      var thesettings = await sails.models.settings.find({ source: `settings_general`, setting: [`RepeatTrackInterval`, `RepeatArtistInteval`, `RepeatAlbumInteval`, `RepeatTitleInteval`] })
      sails.log.silly(`Rotation rule records: ${thesettings}`)
      var rotationRules = {}
      thesettings.map(thesetting => { rotationRules[thesetting.setting] = thesetting.value })

      // Check if we are past the end date of the track
      if (moment(record.end_date).isBefore() && moment(record.end_date).isAfter(`2002-01-01 00:00:01`)) {
        sails.log.verbose(`Track cannot be requested: Track is expired (date).`)
        return exits.success({ requestable: false, message: `You cannot request an expired track.`, listDiv: `warning`, type: `expired` })
      }

      // Check if we have not yet reached the start date of the track
      if (moment(record.start_date).isAfter()) {
        sails.log.verbose(`Track cannot be requested: Track has not yet started via start date.`)
        return exits.success({ requestable: false, message: `You cannot request a track that has not yet reached its start date.`, listDiv: `warning`, type: `expired` })
      }

      // Check if the track has exceeded the number of allowed spin counts
      if (record.limit_action > 0 && record.count_played >= record.play_limit) {
        sails.log.verbose(`Track cannot be requested: Track is expired (spin counts).`)
        return exits.success({ requestable: false, message: `You cannot request an expired track.`, listDiv: `dark`, type: `expired` })
      }

      // Check rotation rules
      var passesRules = true
      var rulesFailed = ``
      if (moment(record.date_played).isAfter(moment().subtract(rotationRules.RepeatTrackInterval, `minutes`))) {
        passesRules = false
        rulesFailed += `<br>*The same track played recently. Wait about ${moment().to(moment(record.date_played).add(rotationRules.RepeatTrackInterval, `minutes`), true)}`
      }
      if (moment(record.title_played).isAfter(moment().subtract(rotationRules.RepeatTitleInteval, `minutes`))) {
        passesRules = false
        rulesFailed += `<br>*A track with same title played recently. Wait about ${moment().to(moment(record.title_played).add(rotationRules.RepeatTitleInteval, `minutes`), true)}`
      }
      if (moment(record.artist_played).isAfter(moment().subtract(rotationRules.RepeatArtistInteval, `minutes`))) {
        passesRules = false
        rulesFailed += `<br>*A track from the same artist played recently. Wait about ${moment().to(moment(record.artist_played).add(rotationRules.RepeatArtistInteval, `minutes`), true)}`
      }
      if (moment(record.album_played).isAfter(moment().subtract(rotationRules.RepeatAlbumInteval, `minutes`))) {
        passesRules = false
        rulesFailed += `<br>*A track from the same album played recently. Wait about ${moment().to(moment(record.album_played).add(rotationRules.RepeatAlbumInteval, `minutes`), true)}`
      }
      if (!passesRules) {
        sails.log.verbose(`Track cannot be requested: Fails rotation rules: ${rulesFailed}`)
        return exits.success({ requestable: false, message: `This track fails one or more playlist rotation rules and cannot be requested at this time:${rulesFailed}`, listDiv: `warning`, type: `rotationRules` })

        // By this point, all rules passed and the track can be requested. Include the request form.
      } else {
        sails.log.verbose(`Track can be requested.`)
        return exits.success({ requestable: true, message: `This track can be requested`, listDiv: `success`, type: `requestable` })
      }
    } catch (e) {
      return exits.error(e)
    }
  }

}
