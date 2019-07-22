module.exports = {

  friendlyName: 'test / add-underwritings',

  description: 'test / add-underwritings test.',

  inputs: {

  },

  fn: async function () {
    // LINT: await required by Sails.js
    // eslint-disable-next-line no-return-await
    return await sails.helpers.break.addUnderwritings(false, 1)
  }

}
