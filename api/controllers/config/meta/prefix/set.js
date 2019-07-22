module.exports = {

  friendlyName: 'config / meta / prefix / set',

  description: 'Set what prefix is displayed in metadata depending on current state.',

  inputs: {
    automation: {
      type: 'string',
      description: 'During automation, this prefix will appear before the currently playing track on line 1 of metadata.'
    },
    genre: {
      type: 'string',
      description: 'During genre, this will appear before the genre currently airing on line 2 of metadata.'
    },
    playlist: {
      type: 'string',
      description: 'During a playlist, this will appear before the playlist currently airing on line 2 of metadata'
    },
    request: {
      type: 'string',
      description: 'When playing a track request in automation, genre, or playlist... this will appear before the name of the person requesting the track on line 2 of metadata.'
    },
    pendLive: {
      type: 'string',
      description: 'When a live show is about to begin, this will appear before the host - show on line 2 of metadata.'
    },
    pendPrerecord: {
      type: 'string',
      description: 'When a prerecorded show is about to begin, this will appear before the prerecord name on line 2 of metadata.'
    },
    pendRemote: {
      type: 'string',
      description: 'When a remote broadcast is about to begin, this will appear before the host - show on line 2 of metadata.'
    },
    pendSports: {
      type: 'string',
      description: 'When a sports broadcast is about to begin, this will appear before the sport on line 2 of metadata.'
    },
    prerecord: {
      type: 'string',
      description: 'During a prerecorded show, this will appear before the name of the prerecord on line 1 of metadata.'
    },
    live: {
      type: 'string',
      description: 'During a live show, this will appear before the host - show on line 1 of metadata.'
    },
    remote: {
      type: 'string',
      description: 'During a remote broadcast, this will appear before the host - show on line 1 of metadata'
    },
    sports: {
      type: 'string',
      description: 'During a sports broadcast, this will appear before the sport being aired on line 1 of metadata'
    },
    playing: {
      type: 'string',
      description: 'In a live, remote, sports, or prerecorded show... this will appear before the track name on line 2 of metadata when something is being played'
    }
  },

  exits: {
  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/meta/prefix/set called.')

    try {
      var returnData = {}
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom.meta.prefix[key] = inputs[key]
          returnData[key] = inputs[key]
        }
      }

      // broadcast changes over websockets
      sails.sockets.broadcast('config', 'config', { update: { meta: sails.config.custom.meta } })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
