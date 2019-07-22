// TODO: Use lodash instead of this
module.exports = {

  friendlyName: `Shuffle`,

  description: `Shuffle an array.`,

  inputs: {
    array: {
      type: `ref`,
      required: true,
      custom: function (value) {
        return _.isArray(value)
      }
    }

  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper shuffle called.`)
    var currentIndex = inputs.array.length; var temporaryValue; var randomIndex

    // While there remain elements to shuffle...
    while (currentIndex !== 0) {
      // Pick a remaining element...
      randomIndex = Math.floor(Math.random() * currentIndex)
      currentIndex -= 1

      // And swap it with the current element.
      temporaryValue = inputs.array[currentIndex]
      inputs.array[currentIndex] = inputs.array[randomIndex]
      inputs.array[randomIndex] = temporaryValue
    }
    sails.log.silly(`New array: ${inputs.array}`)
    return exits.success(inputs.array)
  }

}
