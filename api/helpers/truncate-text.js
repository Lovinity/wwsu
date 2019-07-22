module.exports = {

  friendlyName: 'Truncate text',

  description: 'Truncate a string to a certain length.',

  inputs: {
    str: {
      type: 'string',
      defaultsTo: '',
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
    sails.log.debug('Helper truncateText called.')

    if (inputs.str.length > inputs.strLength) {
      return exits.success(inputs.str.substring(0, inputs.strLength - inputs.ending.length) + inputs.ending)
    } else {
      return exits.success(inputs.str)
    }
  }

}
