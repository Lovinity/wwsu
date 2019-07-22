const sanitizeHtml = require(`sanitize-html`)
const he = require(`he`)

module.exports = {

  friendlyName: `sails.helpers.sanitize`,

  description: `Remove prohibited HTML tags, and fix any broken ones.`,

  inputs: {
    text: {
      type: `string`,
      defaultsTo: ``,
      description: `The string to sanitize.`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`helper sanitize called.`)

    try {
      // Only keep safe HTML according to config
      var clean = sanitizeHtml(inputs.text, sails.config.custom.sanitize)

      // Don't leave &amp;s etc
      clean = he.decode(clean)

      return exits.success(clean)
    } catch (e) {
      return exits.error(e)
    }
  }

}
