/**
 * Events.js
 *
 * @description :: Container of RadioDJ events.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: `radiodj`,
  attributes: {
    ID: {
      type: `number`,
      autoIncrement: true
    },
    type: {
      type: `number`
    },
    time: {
      type: `string`
    },
    name: {
      type: `string`
    },
    date: {
      type: `ref`,
      columnType: `date`
    },
    day: {
      type: `string`
    },
    hours: {
      type: `string`
    },
    data: {
      type: `string`
    },
    enabled: {
      type: `string`,
      isIn: [`True`, `False`]
    },
    catID: {
      type: `number`
    },
    smart: {
      type: `number`
    }
  }

}
