module.exports = async function public(req, res) {
    sails.log.debug('Controller embeds/guardian called.');
    return res.view('embeds/guardian', {layout: 'embeds/layout'});
};
