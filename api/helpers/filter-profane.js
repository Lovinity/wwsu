module.exports = {

  friendlyName: `filterProfane`,

  description: `Filter out any profanity in a string`,

  inputs: {
    message: {
      type: `string`,
      defaultsTo: ``,
      description: `The string to be filtered.`
    }
  },

  exits: {

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper filterProfane called.`)
    try {
      // Run through every configured word of profanity to see if it exists in the string
      sails.config.custom.profanity.map(word => {
        var numbers = getIndicesOf(word, inputs.message, false)
        if (numbers.length > 0) {
          // Asterisk / censor profanity
          numbers.map(number => {
            for (var i = 0; i < word.length; i++) {
              if (i !== 0 && i !== (word.length - 1)) { inputs.message = setCharAt(inputs.message, number + i, `*`) }
            }
          })
        }
      })
      return exits.success(inputs.message)
    } catch (e) {
      return exits.error(e)
    }
  }
}

function getIndicesOf (searchStr, str, caseSensitive) {
  var searchStrLen = searchStr.length
  if (searchStrLen === 0) {
    return []
  }
  var startIndex = 0; var index; var indices = []
  if (!caseSensitive) {
    str = str.toLowerCase()
    searchStr = searchStr.toLowerCase()
  }
  while ((index = str.indexOf(searchStr, startIndex)) > -1) {
    indices.push(index)
    startIndex = index + searchStrLen
  }
  return indices
}

function setCharAt (str, index, chr) {
  if (index > str.length - 1) { return str }
  return str.substr(0, index) + chr + str.substr(index + 1)
}
