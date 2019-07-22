module.exports = {

  friendlyName: 'config / songsliked / set',

  description: 'Set configuration regarding the track liking system.',

  inputs: {
    limit: {
      type: 'number',
      description: 'When a listener likes a track, the same track cannot be liked by the same listener again for at least the specified number of days. If 0, listeners cannot ever like the track again.'
    },
    priorityBump: {
      type: 'number',
      description: 'When a track is liked, by how much should the track\'s priority be bumped (or lowered, if a negative number) in RadioDJ?'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/songsliked/set called.')

    try {
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom.songsliked[key] = inputs[key]
        }
      }

      // broadcast changes over websockets
      sails.sockets.broadcast('config', 'config', { update: { songsliked: sails.config.custom.songsliked } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
