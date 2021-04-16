/**
 * Shootout.js
 *
 * @description :: Shootout manages the WWSU basketball shootout scoreboard.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: 'ram',
  attributes: {
    ID: {
      type: 'number',
      autoIncrement: true
    },
    
    name: {
      type: "string",
      unique: true,
      isIn: [
        "time",
        "round",
        "turn",
        "name1",
        "score1",
        "name2",
        "score2",
        "name3",
        "score3",
        "name4",
        "score4",
        "timeStart",
        "timeStop",
        "timeResume",
        "active"
      ],
      required: true
    },

    value: {
      type: "string"
    }
  },

    // Websockets standards
    afterCreate: function(newlyCreatedRecord, proceed) {
      var data = { insert: newlyCreatedRecord };
      sails.log.silly(`shootout socket: ${data}`);
      sails.sockets.broadcast("shootout", "shootout", data);
      return proceed();
    },
  
    afterUpdate: function(updatedRecord, proceed) {
      var data = { update: updatedRecord };
      sails.log.silly(`shootout socket: ${data}`);
      sails.sockets.broadcast("shootout", "shootout", data);
      return proceed();
    },
  
    afterDestroy: function(destroyedRecord, proceed) {
      var data = { remove: destroyedRecord.ID };
      sails.log.silly(`shootout socket: ${data}`);
      sails.sockets.broadcast("shootout", "shootout", data);
      return proceed();
    }
};

