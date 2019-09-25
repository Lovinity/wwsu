module.exports = {

    friendlyName: 'delay / dump',
  
    description: 'Transmit socket event indicating whichever DJ Controls responsible for the delay system should command the delay system to dump.',
  
    inputs: {
    },
  
    exits: {
    },
  
    fn: async function (inputs, exits) {
      sails.log.debug('Controller delay/dump called.')
  
      try {
        // Transmit dump event through sockets; DJ Controls will manage from there.
        sails.sockets.broadcast('delay-system-dump', 'delay-system-dump', null)
        return exits.success()
      } catch (e) {
        return exits.error(e)
      }
    }
  
  }
  