module.exports = {


  friendlyName: 'helpers.emails.queue',


  description: 'Queue an email for sending.',


  inputs: {
    to: {
      type: 'json',
      required: true,
      description: 'Array of email addresses of the recipients in nodemailer format.'
    },
    cc: {
      type: 'json',
      description: 'Array of email addresses of those who should be CCd, in nodemailer format.'
    },
    subject: {
      type: 'string',
      maxLength: 255,
      required: true,
      description: 'The subject of the email (will be pre-pended with WWSU)'
    },
    text: {
      type: 'string',
      required: true,
      description: 'The body of the email.',
      maxLength: 65535
    },
    sendNow: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Should the email be sent immediately?'
    }
  },


  exits: {

  },


  fn: async function (inputs) {
    // Filter disallowed HTML
    inputs.subject = await sails.helpers.sanitize(inputs.subject)
    inputs.text = await sails.helpers.sanitize(inputs.text)

    // Queue the email
    var record = await sails.models.emails.create({ to: inputs.to, cc: inputs.cc, subject: inputs.subject, text: inputs.text, sent: false }).fetch();

    // If send immediately, send it.
    if (inputs.sendNow) {
      await sails.helpers.emails.send(record.id);
    }
  }


};

