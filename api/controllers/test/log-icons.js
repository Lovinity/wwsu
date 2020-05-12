module.exports = {

    friendlyName: 'log icons',

    description: 'log icons test.',

    inputs: {

    },

    exits: {

    },

    fn: async function (inputs, exits) {
        await sails.models.logs.update({ logtype: 'cancellation', logIcon: '' }, { logIcon: 'fas fa-calendar-minus' });
        await sails.models.logs.update({ logtype: 'silence', logIcon: '' }, { logIcon: 'fas fa-volume-off' });
        await sails.models.logs.update({ logtype: 'silence-track', logIcon: '' }, { logIcon: 'fas fa-forward' });
        await sails.models.logs.update({ logtype: 'silence-switch', logIcon: '' }, { logIcon: 'fas fa-volume-mute' });
        await sails.models.logs.update({ logtype: 'silence-terminated', logIcon: '' }, { logIcon: 'fas fa-microphone-slash' });
        await sails.models.logs.update({ logtype: 'website-likedtrack', logIcon: '' }, { logIcon: 'fas fa-thumbs-up' });
        await sails.models.logs.update({ logtype: 'liner', logIcon: '' }, { logIcon: 'fas fa-angle-double-right' });
        await sails.models.logs.update({ logtype: 'topadd', logIcon: '' }, { logIcon: 'fas fa-headphones' });
        await sails.models.logs.update({ logtype: 'break', logIcon: '' }, { logIcon: 'fas fa-coffee' });
        await sails.models.logs.update({ logtype: 'return', logIcon: '' }, { logIcon: 'fas fa-check' });
        await sails.models.logs.update({ logtype: 'status-reported', logIcon: '' }, { logIcon: 'fas fa-bug' });
        await sails.models.logs.update({ logtype: 'absent', logIcon: '' }, { logIcon: 'fas fa-calendar-times' });
        await sails.models.logs.update({ logtype: 'director-absent', logIcon: '' }, { logIcon: 'fas fa-user-times' });
        await sails.models.logs.update({ logtype: 'sign-on', logIcon: '', event: { contains: 'rotation' } }, { logIcon: 'fas fa-music' });
        await sails.models.logs.update({ logtype: 'track', logIcon: ''}, { logIcon: 'far fa-play-circle' });
        await sails.models.logs.update({ logtype: 'sign-on', logIcon: '', event: { contains: 'DJ is now live' } }, { logIcon: 'fas fa-microphone' });
        await sails.models.logs.update({ logtype: 'sign-on', logIcon: '', event: { contains: 'remote broadcast is now' } }, { logIcon: 'fas fa-broadcast-tower' });
        await sails.models.logs.update({ logtype: 'sign-on', logIcon: '', event: { contains: 'prerecord started airing' } }, { logIcon: 'fas fa-play-circle' });
        await sails.models.logs.update({ logtype: 'subscribers', logIcon: '' }, { logIcon: 'fas fa-bell-slash' });
        await sails.models.logs.update({ logtype: 'website', logsubtype: 'request', logIcon: '' }, { logIcon: 'fas fa-record-vinyl' });
        await sails.models.logs.update({ logtype: 'sign-off', logIcon: ''}, { logIcon: 'fas fa-stop' });
        await sails.models.logs.update({ logtype: 'status', logIcon: ''}, { logIcon: 'fas fa-exclamation-triangle' });
        await sails.models.logs.update({ logtype: 'system', logIcon: ''}, { logIcon: 'fas fa-exclamation-triangle' });
        await sails.models.logs.update({ logtype: 'id', logIcon: ''}, { logIcon: 'fas fa-coffee' });
        await sails.models.logs.update({ logtype: 'reboot', logIcon: ''}, { logIcon: 'fas fa-exclamation-triangle' });
        return exits.success();
    }

}
