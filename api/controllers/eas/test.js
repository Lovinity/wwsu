module.exports = {

    friendlyName: 'EAS / Test',

    description: 'Issue a test in the WWSU Emergency Alert System.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        var moment = require('moment');
        try {
            await Eas.addAlert(moment().valueOf(), 'WWSU', 'Clark, Greene, Montgomery', 'Test', 'Extreme', moment().toISOString(), moment().add(3, 'minutes').toISOString(), '#FFFFFF', 'This is a test of the WWSU Emergency Alert System. This is only a test. The WWSU Emergency Alert System is designed to provide the public with timely emergency information, as well as weather alerts for Clark, Greene, and Montgomery counties of Ohio. Had this been an actual emergency, you would have received information and instructions regarding the emergency. This concludes the test of the WWSU Emergency Alert System.');
            await Eas.postParse();
            return exits.success();
        } catch (e) {
            sails.log.error(e);
            return exits.error();
        }

    }


};
