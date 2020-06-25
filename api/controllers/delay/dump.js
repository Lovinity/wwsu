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
      // Prevent dumping if host is lockToDJ and the specified lockToDJ is not on the air
      if (this.req.payload.ID !== sails.models.meta.memory.host && this.req.payload.lockToDJ !== null && this.req.payload.lockToDJ !== sails.models.meta.memory.dj && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ1 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ2 && this.req.payload.lockToDJ !== sails.models.meta.memory.cohostDJ3)
        throw 'forbidden';

      // Transmit dump event through sockets; DJ Controls will manage from there.
      sails.sockets.broadcast('delay-system-dump', 'delay-system-dump', null)
      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
