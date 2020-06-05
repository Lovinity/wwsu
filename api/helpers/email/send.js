const nodemailer = require('nodemailer');

module.exports = {

  friendlyName: 'helpers.email.send',

  description: 'Send an email out via sendmail.',

  inputs: {
    ID: {
      type: 'number',
      required: true,
      description: 'The ID of the queued email to send.'
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    var record = await sails.models.emails.findOne({ ID: inputs.ID });
    if (!record) return 'Not Found';

    // Set up the transporter
    let transporter = nodemailer.createTransport({
      sendmail: true,
      newline: 'unix',
      path: '/usr/sbin/sendmail'
    });

    // Send the email
    transporter.sendMail({
      from: 'wwsu4@wright.edu',
      to: record.to,
      cc: record.cc,
      subject: `[WWSU] ${record.subject}`,
      text: record.text
    }, (err, info) => {
      sails.models.emails.updateOne({ ID: record.id }, { sent: true, status: err || info }).exec(() => { });

      if (err)
        return exits.error(err);
      return exits.success(info);
    });
  }
}

