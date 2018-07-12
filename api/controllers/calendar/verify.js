module.exports = async function public(req, res) {
    sails.log.debug('Controller calendar/verify called.');
    
    return res.view('calendar/verify', {layout: 'calendar/layout'});
};
