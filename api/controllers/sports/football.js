module.exports = async function womensFinals (req, res) {
  sails.log.debug('Controller called.')
  return res.view('sports/football', { layout: 'sports/layout', timestamp: DateTime.local().valueOf() })
}
