/**
 * Nodeusers.js
 *
 * @description :: Manages users allowed to authenticate to restricted areas of the API.
 */
var bcrypt = require('bcrypt');

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
        // We don't wan't to send back encrypted password either
    },

    customToJSON: function () {
        var obj = this.toObject();
        delete obj.encryptedPassword;
        return obj;
    },
    // Here we encrypt password before creating a User
    beforeCreate: function (values, next) {
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

    comparePassword: function (password, user, cb) {
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

