module.exports = {


  friendlyName: 'Truncate text',


  description: 'Truncate a string to a certain length.',


  inputs: {
      str: {
          type: 'string',
          required: true,
          description: 'The string to truncate'
      },
      
      strLength: {
          type: 'number',
          min: 1,
          defaultsTo: 100,
          description: 'The string should be the specified number of characters after truncation.'
      },
      
      ending: {
          type: 'string',
          defaultsTo: '...',
          description: 'The string to put on the end if truncation happened.'
      }

  },


  fn: async function (inputs, exits) {

    if (inputs.str.length > inputs.strLength) {
        return exits.success(inputs.str.substring(0, inputs.strLength - inputs.ending.strLength) + inputs.ending);
    } else {
        return exits.success(inputs.str);
    }

  }


};

