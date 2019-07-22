module.exports = async function mensFinals (req, res) {
  sails.log.debug(`Controller called.`)
  return res.view(`sports/menfinals`, { layout: `sports/layout`, timestamp: moment().valueOf() })
}
