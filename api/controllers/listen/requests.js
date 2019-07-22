module.exports = async function requests (req, res) {
  sails.log.debug(`Controller listen/requests called.`)
  return res.view(`listen/requests`, { layout: `listen/layout`, timestamp: moment().format(`YYYYMMDD`), requestLimit: sails.config.custom.requests.dailyLimit })
}
