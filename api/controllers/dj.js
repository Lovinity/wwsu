module.exports = async function listen (req, res) {
  sails.log.debug('Controller listen called.')
  return res.view('dj/panel', { layout: 'dj/layout', timestamp: DateTime.local().valueOf() })
}
