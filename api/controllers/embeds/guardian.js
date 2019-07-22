module.exports = async function guardianEmbed (req, res) {
  sails.log.debug('Controller embeds/guardian called.')
  return res.view('embeds/guardian', { layout: 'embeds/layout' })
}
