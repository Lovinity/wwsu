module.exports = {


    friendlyName: 'test / add-underwritings',
  
  
    description: 'test / add-underwritings test.',
  
  
    inputs: {
  
    },
  
  
    fn: async function (inputs, exits) {
  
      return sails.helpers.break.addUnderwritings(false, 1);
  
    }
  
  
  };