// LINT: camel casing not used in RadioDJ
/* eslint-disable camelcase */
/**
 * History.js
 *
 * @description :: A model definition.  Represents a database table/collection/etc.
 * @docs        :: https://sailsjs.com/docs/concepts/models-and-orm/models
 */

module.exports = {
  datastore: `radiodj`,
  attributes: {

    ID: {
      type: `number`,
      autoIncrement: true
    },

    trackID: {
      type: `number`
    },

    date_played: {
      type: `ref`,
      columnType: `datetime`,
      defaultsTo: `2002-01-01 00:00:01`
    },

    song_type: {
      type: `number`,
      max: 99,
      min: 0
    },

    id_subcat: {
      type: `number`
    },

    id_genre: {
      type: `number`
    },

    duration: {
      type: `number`
    },

    artist: {
      type: `string`
    },

    original_artist: {
      type: `string`
    },

    title: {
      type: `string`
    },

    album: {
      type: `string`
    },

    composer: {
      type: `string`
    },

    label: {
      type: `string`
    },

    year: {
      type: `string`,
      maxLength: 4
    },

    track_no: {
      type: `number`,
      max: 999999,
      min: 0
    },

    disc_no: {
      type: `number`,
      max: 999999,
      min: 0
    },

    publisher: {
      type: `string`
    },

    copyright: {
      type: `string`
    },

    isrc: {
      type: `string`
    },

    listeners: {
      type: `number`
    }
  }

}
