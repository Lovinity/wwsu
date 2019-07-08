var jwt = require('jsonwebtoken');

module.exports = {

    friendlyName: 'Token',

    description: 'Token test.',

    inputs: {

    },

    fn: async function (inputs, exits) {

        var temp1 = jwt.sign({foo: 'bar', foo2: 1, exp: Math.floor(Date.now() / 1000) + (60 * 60)}, 'shhhhh');

        try {
            var temp2 = jwt.verify(temp1, 'shhhhh');
        } catch (e) {
            var temp2 = 'NOT VALID';
        }

        var temp3 = jwt.sign({foo: 'bar', foo2: 1, exp: Math.floor(Date.now() / 1000) + (60 * 60)}, 'shhhhh', {subject: 'director'});

        try {
            var temp4 = jwt.verify(temp3, 'shhhhh', {subject: 'noDirector'});
        } catch (e) {
            var temp4 = 'NOT VALID';
        }

        try {
            var temp5 = jwt.verify(temp3, 'shhhhh', {subject: 'director'});
        } catch (e) {
            var temp5 = 'NOT VALID';
        }

        return exits.success({temp1: temp1, temp2: temp2, temp3: temp3, temp4: temp4, temp5: temp5});

    }


};
