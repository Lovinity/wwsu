module.exports = async function remote (req, res) {
  sails.log.debug('Controller called.')
  return res.view('sports/football-remote', { layout: 'sports/layout', timestamp: DateTime.local().valueOf() })
}
