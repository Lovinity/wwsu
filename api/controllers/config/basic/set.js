module.exports = {

  friendlyName: 'config / basic / set',

  description: 'Set new basic configuration',

  inputs: {

    website: {
      type: 'string',
      isURL: true,
      description: `URL to WWSU's website; used by Status to check if the website goes offline.`
    },

    stream: {
      type: 'string',
      isURL: true,
      description: `URL to the Shoutcast v2.6 radio stream server. Used to monitor status and record listener counts.`
    },

    hostSecret: {
      type: 'string',
      description: `A random secret key used for generating hashes for public hosts / web mobile visitors. CHANGING THIS WILL INVALIDATE ACTIVE DISCIPLINE.`
    },

    startOfSemester: {
      type: 'string',
      custom: function (value) {
        return moment(value).isValid()
      },
      description: `ISO string of when the current semester started, used to reset remote credit counts.`
    },

    lofi: {
      type: 'boolean',
      description: `If true, backend will skip the checks CRON. This will also disable some subsystems like metadata. Recommended only change by a developer.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller config/basic/set called.')

    try {
      var returnData = {}
      // Set the new configuration of any and all values provided as input
      for (var key in inputs) {
        if (Object.prototype.hasOwnProperty.call(inputs, key)) {
          sails.config.custom[key] = inputs[key]

          // Do not return hostSecret through websockets; this is a secret
          if (key !== `hostSecret`) { returnData[key] = inputs[key] }
        }
      }

      // broadcast changes over websockets
      sails.sockets.broadcast('config', 'config', { update: inputs })

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
