module.exports = async function listen (req, res) {
  sails.log.debug('Controller listen called.')
  return res.view('dj/home', { layout: 'dj/layout', timestamp: moment().format('YYYYMMDD') })
}
