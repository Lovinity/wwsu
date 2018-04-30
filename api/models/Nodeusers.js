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

    // Get rid of encrypted password responses in the API
    customToJSON: function () {
        var obj = this.toObject();
        delete obj.encryptedPassword;
        return obj;
    },

    // Here we encrypt password before creating a User
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

    // Make sure a password specified is correct for the user
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

