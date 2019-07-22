module.exports = {

  friendlyName: 'Display / Refresh',

  description: 'Sends a refresh signal to the display signs connected to websockets. Causes display signs to refresh the page and receive updated JS and HTML.',

  inputs: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller display/refresh called.')
    sails.sockets.broadcast('display-refresh', 'display-refresh', true)
    sails.log.verbose('Sent out a refresh request to display-refresh.')
    return exits.success()
  }

}
