module.exports = async function internal (req, res) {
  sails.log.debug('Controller display/internal called.')

  // Disable cacheing. Cache should not be active on display signs, or the refresh command will be ineffective.
  res.header('Cache-Control', 'private, no-cache, no-store, must-revalidate')
  res.header('Expires', '-1')
  res.header('Pragma', 'no-cache')

  return res.view('display/internal', { layout: 'display/layout', timestamp: DateTime.local().valueOf() })
}
