/* global sails */

module.exports = {


  friendlyName: 'sails.helpers.pickRandom',


  description: 'Pick a random item from an array. Returns an object {item: itempicked, newArray: [array]}.',


  inputs: {
      items: {
          type: 'ref',
          required: true,
          description: 'The array to pick something random from.'
      },
      remove: {
          type: 'boolean',
          defaultsTo: false,
          description: 'If true, the chosen item from the array will be deleted from the return of newArray.'
      }
  },


  fn: async function (inputs, exits) {
      sails.log.debug('Helper pickRandom called.');
    try {
        if (typeof inputs.items.length === 'undefined' || inputs.items.length <= 0)
            return exits.success({item: null, newArray: []});
        
        // Choose a random item
        var random = Math.floor(Math.random() * (inputs.items.length || 0));
        var item = inputs.items[random];
        
        // Remove the item from the array if necessary
        if (inputs.remove)
            inputs.items.splice(random, 1);
        
        return exits.success({item: item, newArray: inputs.items});
        
        
    } catch (e) {
        return exits.error(e);
    }
  }


};

