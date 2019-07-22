module.exports = {

  friendlyName: `Restructure`,

  description: `Restructure test.`,

  inputs: {

  },

  exits: {

  },

  fn: async function (inputs, exits) {
    /*
      var genres = await Subcategory.find({parentid: 1});
      var genres2 = await Genre.find();
      var genresO = {};
      var subcatsO = {};
      genres2.forEach(function(genre) {
          genresO[genre.name] = genre.ID;
      });
      var subcats = [];
      genres.forEach(function(genre) {
         subcats.push(genre.ID);
         subcatsO[genre.ID] = genre.name;
      });
      console.log(subcats.length);
      for (var key in subcatsO)
      {
          if (subcatsO.hasOwnProperty(key))
          {
              if (typeof genresO[subcatsO[key]] !== 'undefined')
              {
                  await Songs.update({id_subcat: key}, {id_subcat: 208, id_genre: genresO[subcatsO[key]]});
              }
          }
      }
      */

    var tracks = await sails.models.playlists_list.find({ pID: [14, 15, 16, 18, 24, 26, 27] })
    var trackUpdate = []
    tracks.map(track => trackUpdate.push(track.sID))
    await sails.models.songs.update({ ID: trackUpdate }, { id_subcat: 211 })
    return exits.success()
  }

}
