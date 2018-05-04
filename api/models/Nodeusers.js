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
        },
    },

    /**
     * Sails.js function override: When responding through API, do not send encrypted password!
     */

    customToJSON: function () {
        var obj = this.toObject();
        delete obj.encryptedPassword;
        return obj;
    },

    /**
     * Before creating a new user, we need to bcrypt the password.
     * @constructor
     * @param {object} values - Object of values during the create action
     * @param {function} next - Callback function
     */
    beforeCreate: function (values, next) {
        var bcrypt = require('bcrypt');
        var salt = bcrypt.genSalt(10)
                .then(salt => {
                    bcrypt.hash(values.password, salt)
                            .then(hash => {
                                values.encryptedPassword = hash;
                                return next();
                            })
                            .catch(err => {
                                return next(err);
                            })
                })
                .catch(err => {
                    return next(err);
                })
    },

    /**
     * Check to see if a provided password matches the given password for the user
     * @constructor
     * @param {string} password - The password to check
     * @param {string} user - Check the password against the provided user.
     */
  
    comparePassword: function (password, user) {
        return new Promise((resolve) => {
            var bcrypt = require('bcrypt');
            bcrypt.compare(password, user.encryptedPassword)
                    .then(match => {
                        if (match) {
                            resolve(true);
                        } else {
                            resolve(false);
                        }
                    })
                    .catch(err => {
                        resolve(false);
                    })
        });
    }
};

