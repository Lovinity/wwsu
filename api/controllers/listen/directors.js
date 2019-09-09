module.exports = async function calendar (req, res) {
  sails.log.debug('Controller listen/directors called.')
  return res.view('subscriptions/home', { layout: 'subscriptions/layout', timestamp: moment().format('YYYYMMDD') })
}
