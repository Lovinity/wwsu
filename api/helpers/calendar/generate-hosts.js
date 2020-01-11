module.exports = {

  friendlyName: 'calendar.generateHosts',

  description: 'Generate a host string from the provided event.',

  inputs: {
    event: {
      type: 'json',
      required: true
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper calendar.generateHosts called.`);

    var event = inputs.event;
    var hosts = `Unknown Hosts`;

    if (event.director && event.director !== null) {
      var temp = await sails.models.directors.findOne({ ID: event.director });
      if (temp) {
        hosts = temp.name;
      }
    }
    if (event.hostDJ && event.hostDJ !== null) {
      var temp = await sails.models.djs.findOne({ ID: event.hostDJ });
      if (temp) {
        hosts = temp.name;
      }
    }
    if (event.cohostDJ1 && event.cohostDJ1 !== null) {
      var temp = await sails.models.djs.findOne({ ID: event.cohostDJ1 });
      if (temp) {
        hosts = `${hosts}; ${temp.name}`;
      }
    }
    if (event.cohostDJ2 && event.cohostDJ2 !== null) {
      var temp = await sails.models.djs.findOne({ ID: event.cohostDJ2 });
      if (temp) {
        hosts = `${hosts}; ${temp.name}`;
      }
    }
    if (event.cohostDJ3 && event.cohostDJ3 !== null) {
      var temp = await sails.models.djs.findOne({ ID: event.cohostDJ3 });
      if (temp) {
        hosts = `${hosts}; ${temp.name}`;
      }
    }

    return exits.success(hosts);
  }

}
