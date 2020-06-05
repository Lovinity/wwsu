const nodemailer = require('nodemailer');

module.exports = {

    friendlyName: 'Email',

    description: 'email test.',

    inputs: {
        to: {
            type: 'string',
            isEmail: true,
            required: true
        }
    },

    exits: {

    },

    fn: async function (inputs, exits) {
        let transporter = nodemailer.createTransport({
            sendmail: true,
            newline: 'unix',
            path: '/usr/sbin/sendmail'
        });
        transporter.sendMail({
            from: 'wwsu4@wright.edu',
            to: inputs.to,
            subject: 'Message',
            text: 'I hope this message gets delivered!'
        }, (err, info) => {
            if (err)
                return exits.error(err);
            return exits.success(info);
        });
    }
}
