module.exports = {


    friendlyName: 'helpers.emails.queueDjs',
  
  
    description: 'Queue emails to emailDJs.',
  
  
    inputs: {
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
  
      // Load in directors
      var records = await sails.models.directors.find({ emailDJs: true });
      to = records
        .filter((record) => record.email && record.email !== '')
        .map((record) => record.email);
  
      // Queue the email
      await sails.helpers.emails.queue(to, null, inputs.subject, inputs.text, inputs.sendNow);
  
  
    }
  
  
  };
  