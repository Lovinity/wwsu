module.exports = {


  friendlyName: 'Week to int',


  description: 'Convert a day of week, hour, and minute into an integer',


  inputs: {
      dayOfWeek: {
          type: 'number',
          required: true
      },
      hour: {
          type: 'number',
          required: true
      },
      minute: {
          type: 'number',
          required: true
      }
  },


  exits: {

  },


  fn: async function (inputs, exits) {
    return exits.success((inputs.dayOfWeek * 24 * 60) + (inputs.hour * 60) + inputs.minute);
  }


};

