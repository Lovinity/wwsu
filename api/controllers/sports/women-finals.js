module.exports = async function womensFinals (req, res) {
  sails.log.debug('Controller called.')
  return res.view('sports/womenfinals', { layout: 'sports/layout', timestamp: moment().valueOf() })
}
