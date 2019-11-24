module.exports = async function guardianEmbed (req, res) {
    sails.log.debug('Controller embeds/guardian-ad called.')
    return res.view('embeds/guardian-ad', { layout: 'embeds/layout' })
  }