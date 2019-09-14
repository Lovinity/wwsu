module.exports = async function remote (req, res) {
  sails.log.debug('Controller called.')
  return res.view('sports/basketball-remote', { layout: 'sports/layout', timestamp: moment().valueOf() })
}
