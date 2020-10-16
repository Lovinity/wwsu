const nodemailer = require('nodemailer');

module.exports = {

  friendlyName: 'helpers.emails.send',

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
      from: 'wwsu1069fm@wright.edu',
      to: record.to ? record.to : undefined,
      cc: record.cc ? record.cc : undefined,
      subject: record.subject,
      text: record.text,
      html: record.text
    }, (err, info) => {
      sails.models.emails.updateOne({ ID: record.ID }, { sent: true, status: err || info }).exec(() => { });

      if (err)
        return exits.error(err);
      return exits.success(info);
    });
  }
}

