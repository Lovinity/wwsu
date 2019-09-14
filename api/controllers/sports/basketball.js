module.exports = async function mensFinals (req, res) {
  sails.log.debug('Controller called.')
  return res.view('sports/basketball', { layout: 'sports/layout', timestamp: moment().valueOf() })
}
