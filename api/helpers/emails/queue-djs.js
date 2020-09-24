module.exports = {


  friendlyName: 'helpers.emails.queueDjs',


  description: 'Queue emails to emailCalendar directors and specific DJs in an event.',


  inputs: {
    event: {
      type: 'ref',
      required: true,
      description: 'The calendardb event (we just need dj data).'
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
    },
    skipDirectors: {
      type: 'boolean',
      defaultsTo: false,
      description: 'Do not include directors in the email.'
    },
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
    if (!inputs.skipDirectors) {
      var records = await sails.models.directors.find({ emailCalendar: true });
      cc = records
        .filter((record) => record.email && record.email !== '')
        .map((record) => record.email);
    }

    // If no DJs in to, make directors to instead.
    if (to.length === 0) {
      to = cc;
      cc = null;
    }

    // Queue the email
    if (to.length > 0)
      await sails.helpers.emails.queue(to, cc, inputs.subject, inputs.text, inputs.sendNow);


  }


};

