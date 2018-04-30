/**
 * Nodeusers.js
 *
 * @description :: Manages users allowed to authenticate to restricted areas of the API.
 */

// WORK ON THIS

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
        bcrypt.genSalt(10, function (err, salt) {
            if (err)
                return next(err);
            bcrypt.hash(values.password, salt, function (err, hash) {
                if (err)
                    return next(err);
                values.encryptedPassword = hash;
                next();
            })
        })
    },

    // Make sure a password specified is correct for the user
    comparePassword: function (password, user, cb) {
        var bcrypt = require('bcrypt');
        bcrypt.compare(password, user.encryptedPassword, function (err, match) {

            if (err)
                cb(err);
            if (match) {
                cb(null, true);
            } else {
                cb(err);
            }
        })
    }
};

