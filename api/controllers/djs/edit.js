const bcrypt = require('bcrypt')
module.exports = {

  friendlyName: 'djs / edit',

  description: 'Change the name or login of a DJ. If a DJ with the same name already exists, the two DJs will be merged.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID of the dj to edit.'
    },
    name: {
      type: 'string',
      custom: function (value) { // Prevent use of space dash space, or "; ", in names as this will cause problems in the system
        var temp2 = value.split(' - ')
        if (temp2.length > 1) { return false }
        var temp3 = value.split("; ")
        if (temp3.length > 1) { return false }
        return true
      },
      description: 'The new name for the DJ.'
    },
    realName: {
      type: 'string',
      description: 'The full real name of the DJ.'
    },
    email: {
      type: 'string',
      description: 'The email address of the DJ.'
    },
    login: {
      type: 'string',
      allowNull: true,
      description: 'The new login for the DJ.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug('Controller djs/edit called.')

    try {
      // Determine what needs updating
      var criteria = {}

      // If a name is provided, ensure this name is not already taken.
      if (inputs.name && inputs.name !== '') {
        criteria.name = inputs.name

        var dj = await sails.models.djs.findOne({ID: inputs.ID});
        if (dj && dj.name !== inputs.name) {
          var dj2 = await sails.models.djs.find({name: inputs.name});
          if (dj2.length > 0) {
            return exits.error(new Error("A DJ with this name already exists"));
          }
        }
      }

      if (inputs.realName)
        criteria.realName = inputs.realName;

      if (inputs.email)
        criteria.email = inputs.email;

      if (inputs.email === "remove@example.com") {
        criteria.email = null;
      }

      // Encrypt login
      if (inputs.login !== null && inputs.login !== "remove" && typeof inputs.login !== 'undefined') { criteria.login = bcrypt.hashSync(inputs.login, 10) }

      if (inputs.login === "remove") {
        criteria.login = null;
      }

      // We must clone the InitialValues object due to how Sails.js manipulates any objects passed as InitialValues.
      var criteriaB = _.cloneDeep(criteria)

      // Edit it
      await sails.models.djs.update({ ID: inputs.ID }, criteriaB).fetch()

      return exits.success()
    } catch (e) {
      return exits.error(e)
    }
  }

}
