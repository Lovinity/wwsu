module.exports = {

  friendlyName: 'Needle',

  description: 'Needle test.',

  inputs: {
    url: {
      type: 'string',
      required: true
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    try {
      var resp = await needle('get', inputs.url, {}, { headers: { 'Content-Type': 'application/json' } });
      return exits.success(resp.body);
    } catch (e) {
      return exits.error(e)
    }
  }

}
