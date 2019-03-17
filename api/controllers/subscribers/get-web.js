/* global sails, sh, Subscribers */

module.exports = {


  friendlyName: 'subscribers / Get-web',


  description: 'Retrieve an array of the active push notification subscriptions for the specified device.',


  inputs: {
      device: {
          type: 'string',
          required: true,
          description: "The OneSignal ID of the device to get subscriptions for."
      }
  },


  exits: {

  },


  fn: async function (inputs, exits) {
        sails.log.debug('Controller subscribers/get-web called.');

        try {
            // Get subscriptions from this host
            var records = await Subscribers.find({device: inputs.device});
            
            return exits.success(records);
        } catch (e) {
            return exits.error(e);
        }
  }


};
