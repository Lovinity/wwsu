module.exports = {


  friendlyName: 'helpers.emails.queueDjs',


  description: 'Queue emails to emailDJs and specific DJs in an event.',


  inputs: {
    event: {
      type: 'ref',
      required: true,
      description: 'The calendardb event.'
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
    var to = [];
    var cc = [];

    // Load in DJs to send to
    var maps = [ 'hostDJ', 'cohostDJ1', 'cohostDJ2', 'cohostDJ3' ].map(async (key) => {
      if (!inputs.event[ key ]) return;

      var query = {};

      var dj = await sails.models.djs.findOne({ ID: inputs.event[ key ] });
      if (dj && dj.email && dj.email !== '') {
        to.push(dj.email);
      }
    });
    await Promise.all(maps);

    // Load in directors to be CCd
    var records = await sails.models.directors.find({ emailDJs: true });
    cc = records
      .filter((record) => record.email && record.email !== '')
      .map((record) => record.email);

    // Queue the email
    await sails.helpers.emails.queue(to, cc, inputs.subject, inputs.text, inputs.sendNow);


  }


};

