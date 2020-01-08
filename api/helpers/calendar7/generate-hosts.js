module.exports = {

  friendlyName: 'calendar.generateHosts',

  description: 'Generate a host string from the provided event.',

  event: {
    event: {
      type: 'json',
      required: true
    }
  },

  fn: async function (inputs, exits) {

    event = inputs.event;
    var hosts = null;

    if (event.director && event.director !== null) {
      var temp = await sails.models.directors.findOne({ ID: event.director });
      if (!temp) {
        return exits.error("Provided director ID does not exist.");
      } else {
        hosts = director.name;
      }
    }
    if (event.hostDJ && event.hostDJ !== null) {
      var temp = await sails.models.djs.findOne({ ID: event.hostDJ });
      if (!temp) {
        return exits.error("Provided hostDJ ID does not exist.");
      } else {
        hosts = temp.name;
      }
    }
    if (event.cohostDJ1 && event.cohostDJ1 !== null) {
      var temp = await sails.models.djs.findOne({ ID: event.cohostDJ1 });
      if (!temp) {
        return exits.error("Provided cohostDJ1 ID does not exist.");
      } else {
        hosts = `${hosts}; ${temp.name}`;
      }
    }
    if (event.cohostDJ2 && event.cohostDJ2 !== null) {
      var temp = await sails.models.djs.findOne({ ID: event.cohostDJ2 });
      if (!temp) {
        return exits.error("Provided cohostDJ2 ID does not exist.");
      } else {
        hosts = `${hosts}; ${temp.name}`;
      }
    }
    if (event.cohostDJ3 && event.cohostDJ3 !== null) {
      var temp = await sails.models.djs.findOne({ ID: event.cohostDJ3 });
      if (!temp) {
        return exits.error("Provided cohostDJ3 ID does not exist.");
      } else {
        hosts = `${hosts}; ${temp.name}`;
      }
    }

    return exits.success(hosts);
  }

}
