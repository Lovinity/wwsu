module.exports = {

    friendlyName: 'EAS / Test',

    description: 'Issue a test in the WWSU Emergency Alert System.',

    inputs: {

    },

    fn: async function (inputs, exits) {
        try {
            sails.log.debug('Controller eas/test called.');

            // Add test alerts
            var value = moment().valueOf();
            await sails.helpers.eas.addAlert(value, 'WWSU', 'Clark', 'Test', 'Severe', moment().toISOString(true), moment().add(3, 'minutes').toISOString(true), '#FFFFFF', 'This is a test of the WWSU Emergency Alert System. This is only a test. The WWSU Emergency Alert System is designed to provide the public with timely emergency information, as well as weather alerts for Clark, Greene, and Montgomery counties of Ohio. Had this been an actual emergency, you would have received information and instructions regarding the emergency. This concludes the test of the WWSU Emergency Alert System.');
            await sails.helpers.eas.addAlert(value, 'WWSU', 'Greene', 'Test', 'Severe', moment().toISOString(true), moment().add(3, 'minutes').toISOString(true), '#FFFFFF', 'This is a test of the WWSU Emergency Alert System. This is only a test. The WWSU Emergency Alert System is designed to provide the public with timely emergency information, as well as weather alerts for Clark, Greene, and Montgomery counties of Ohio. Had this been an actual emergency, you would have received information and instructions regarding the emergency. This concludes the test of the WWSU Emergency Alert System.');
            await sails.helpers.eas.addAlert(value, 'WWSU', 'Montgomery', 'Test', 'Severe', moment().toISOString(true), moment().add(3, 'minutes').toISOString(true), '#FFFFFF', 'This is a test of the WWSU Emergency Alert System. This is only a test. The WWSU Emergency Alert System is designed to provide the public with timely emergency information, as well as weather alerts for Clark, Greene, and Montgomery counties of Ohio. Had this been an actual emergency, you would have received information and instructions regarding the emergency. This concludes the test of the WWSU Emergency Alert System.');

            // Post EAS tasks (what actually pushes the new alert)
            await sails.helpers.eas.postParse();

            return exits.success();
        } catch (e) {
            return exits.error(e);
        }

    }


};
