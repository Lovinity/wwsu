module.exports = async function listen (req, res) {
  sails.log.debug('Controller listen called.')
  return res.view('listen/home', { layout: 'listen/layout', timestamp: moment().format('YYYYMMDD'), requestLimit: sails.config.custom.requests.dailyLimit })
}
