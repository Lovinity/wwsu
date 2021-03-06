/**
 * Route Mappings
 * (sails.config.routes)
 *
 * Your routes tell Sails what to do each time it receives a request.
 *
 * For more information on configuring custom routes, check out:
 * https://sailsjs.com/anatomy/config/routes-js
 */

module.exports.routes = {
  //  ╦ ╦╔═╗╔╗ ╔═╗╔═╗╔═╗╔═╗╔═╗
  //  ║║║║╣ ╠╩╗╠═╝╠═╣║ ╦║╣ ╚═╗
  //  ╚╩╝╚═╝╚═╝╩  ╩ ╩╚═╝╚═╝╚═╝

  /***************************************************************************
   *                                                                          *
   * Make the view located at `views/homepage.ejs` your home page.            *
   *                                                                          *
   * (Alternatively, remove this and add an `index.html` file in your         *
   * `assets` directory)                                                      *
   *                                                                          *
   ***************************************************************************/

  /***************************************************************************
   *                                                                          *
   * More custom routes here...                                               *
   * (See https://sailsjs.com/config/routes for examples.)                    *
   *                                                                          *
   * If a request to a URL doesn't match any of the routes in this file, it   *
   * is matched against "shadow routes" (e.g. blueprint routes).  If it does  *
   * not match any of those, it is matched against static assets.             *
   *                                                                          *
   ***************************************************************************/

  //  ╔═╗╔═╗╦  ╔═╗╔╗╔╔╦╗╔═╗╔═╗╦╔╗╔╔╦╗╔═╗
  //  ╠═╣╠═╝║  ║╣ ║║║ ║║╠═╝║ ║║║║║ ║ ╚═╗
  //  ╩ ╩╩  ╩  ╚═╝╝╚╝═╩╝╩  ╚═╝╩╝╚╝ ╩ ╚═╝

  //  ╦ ╦╔═╗╔╗ ╦ ╦╔═╗╔═╗╦╔═╔═╗
  //  ║║║║╣ ╠╩╗╠═╣║ ║║ ║╠╩╗╚═╗
  //  ╚╩╝╚═╝╚═╝╩ ╩╚═╝╚═╝╩ ╩╚═╝

  //  ╔╦╗╦╔═╗╔═╗
  //  ║║║║╚═╗║
  //  ╩ ╩╩╚═╝╚═╝

  "GET /": {
    view: "website/home",
    locals: {
      layout: "website/layout"
    }
  },

  "GET /listen": {
    view: "website/home",
    locals: {
      layout: "website/layout"
    }
  },

  "GET /chat": {
    view: "website/chat",
    locals: {
      layout: "website/layout"
    }
  },

  "GET /schedule": {
    view: "website/schedule",
    locals: {
      layout: "website/layout"
    }
  },

  "GET /hours": {
    view: "website/hours",
    locals: {
      layout: "website/layout"
    }
  },

  "GET /request": {
    view: "website/request",
    locals: {
      layout: "website/layout"
    }
  },

  "GET /directors": {
    view: "directors/timesheets",
    locals: {
      layout: "directors/layout"
    }
  },

  "GET /directors/timesheets": {
    view: "directors/timesheets",
    locals: {
      layout: "directors/layout"
    }
  },

  "GET /directors/calendar": {
    view: "directors/calendar",
    locals: {
      layout: "directors/layout"
    }
  },

  "GET /directors/shootout": {
    view: "directors/shootout",
    locals: {
      layout: "directors/layout"
    }
  },

  "GET /director/:director": function(req, res) {
    return res.view("directors/director", {
      layout: "directors/layout",
      director: req.param("director")
    });
  },

  "GET /recordings":
    "https://raidermailwright-my.sharepoint.com/:f:/g/personal/wwsu4_wright_edu/EtXkb0rxp8RLgDIkUF7qg-QB-MQ1vxguf-qUrx0dUPq5eg"
};
