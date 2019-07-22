const queryString = require('query-string')

module.exports = {

  friendlyName: 'Pending',

  description: 'Pending test.',

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    try {
      // Get all noFade tracks
      var records = await sails.models.songs.find()
      if (records && records.length > 0) {
        records
          .filter((record) => sails.config.custom.subcats.noFade.indexOf(record.id_subcat) !== -1)
          .map((record) => {
            var cueData = queryString.parse(record.cue_times)
            // If fade in and fade out are both 0 (treat when fade in or fade out is not specified as being 0), skip this track; nothing to do.
            if ((!cueData.fin || cueData.fin === 0) && (!cueData.fou || cueData.fou === 0)) { return null }

            // Get rid of any fading, and reset the xta cue point
            cueData.fin = 0
            cueData.fou = 0
            cueData.xta = cueData.end || record.duration

            cueData = `&${queryString.stringify(cueData)}`;

            // Update the track with the new cue points
            (async (record2, cueData2) => {
              await sails.models.songs.update({ ID: record2.ID }, { cue_times: cueData2 })
            })(record, cueData)
          })
      }
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
