/**
 * Policy Mappings
 * (sails.config.policies)
 *
 * Policies are simple functions which run **before** your actions.
 *
 * For more information on configuring policies, check out:
 * https://sailsjs.com/docs/concepts/policies
 */

module.exports.policies = {

    /***************************************************************************
     *                                                                          *
     * Default policy for all controllers and actions, unless overridden.       *
     * (`true` allows public access)                                            *
     *                                                                          *
     ***************************************************************************/

    '*': 'isAuthorized', // Everything resctricted here
    'analytics/weekly-dj': 'isBanned',
    'user/auth': 'isBanned',
    'announcements/get': 'isBanned',
    'calendar/get': 'isBanned',
    'calendar/verify': 'isBanned',
    'calendar/verify-data': 'isBanned',
    'directors/get': 'isBanned',
    'directors/get-hours': 'isBanned',
    'display/public': 'isBanned',
    'display/internal': 'isBanned',
    'eas/get': 'isBanned',
    'hosts/get': 'isBanned',
    'logs/get': 'isBanned',
    'logs/get-subtypes': 'isBanned',
    'logs/view': 'isBanned',
    'messages/get-web': 'isBanned',
    'messages/send-web': 'isBanned',
    'meta/get': 'isBanned',
    'recipients/add-display': 'isBanned',
    'recipients/add-web': 'isBanned',
    'recipients/edit-web': 'isBanned',
    'recipients/get': 'isBanned',
    'requests/place': 'isBanned',
    'silence/active': 'isBanned',
    'silence/inactive': 'isBanned',
    'songs/get': 'isBanned',
    'songs/get-genres': 'isBanned',
    'songs/get-liked': 'isBanned',
    'songs/like': 'isBanned',
    'status/get': 'isBanned',
    'tasks/get': 'isBanned',
    'timesheet/add': 'isBanned',
    'timesheet/get': 'isBanned',
    'timesheet/view': 'isBanned',
    'listen': 'isBanned',
    'listen/listen': 'isBanned',
    'listen/chat': 'isBanned',
    'listen/calendar': 'isBanned',
    'listen/requests': 'isBanned',
    'embeds/*': 'isBanned'
};
