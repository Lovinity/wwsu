/**
 * Nodeusers.js
 *
 * @description :: Manages users allowed to authenticate to restricted areas of the API.
 */

module.exports = {
  datastore: 'nodebase',
  attributes: {
    //  ╔═╗╦═╗╦╔╦╗╦╔╦╗╦╦  ╦╔═╗╔═╗
    //  ╠═╝╠╦╝║║║║║ ║ ║╚╗╔╝║╣ ╚═╗
    //  ╩  ╩╚═╩╩ ╩╩ ╩ ╩ ╚╝ ╚═╝╚═╝

    //  ╔═╗╔╦╗╔╗ ╔═╗╔╦╗╔═╗
    //  ║╣ ║║║╠╩╗║╣  ║║╚═╗
    //  ╚═╝╩ ╩╚═╝╚═╝═╩╝╚═╝

    //  ╔═╗╔═╗╔═╗╔═╗╔═╗╦╔═╗╔╦╗╦╔═╗╔╗╔╔═╗
    //  ╠═╣╚═╗╚═╗║ ║║  ║╠═╣ ║ ║║ ║║║║╚═╗
    //  ╩ ╩╚═╝╚═╝╚═╝╚═╝╩╩ ╩ ╩ ╩╚═╝╝╚╝╚═╝
    ID: {
      type: 'number',
      autoIncrement: true
    },

    email: {
      type: 'string',
      isEmail: true,
      required: true,
      unique: true // Yes unique one
    },

    encryptedPassword: {
      type: 'string'
    }
  },

  /**
     * Sails.js function override: When responding through API, do not send encrypted password!
     */

  customToJSON: function () {
    return _.omit(this, ['encryptedPassword'])
  },

  /**
     * Check to see if a provided password matches the given password for the user
     * @constructor
     * @param {string} password - The password to check
     * @param {string} user - Check the password against the provided user.
     */

  comparePassword: function (password, user) {
    return new Promise((resolve) => {
      var bcrypt = require('bcrypt')
      bcrypt.compare(password, user.encryptedPassword)
        .then(match => {
          if (match) {
            return resolve(true)
          } else {
            return resolve(false)
          }
        })
        .catch(() => {
          return resolve(false)
        })
    })
  }
}
