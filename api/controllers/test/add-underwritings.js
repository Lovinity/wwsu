module.exports = {


    friendlyName: 'test / add-underwritings',


    description: 'test / add-underwritings test.',


    inputs: {

    },


    fn: async function () {

      return await sails.helpers.break.addUnderwritings(false, 1);

    }


  };
