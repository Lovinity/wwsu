module.exports = {

  friendlyName: `difference`,

  description: `Determine the differences between two objects.`,

  inputs: {
    o1: {
      required: true,
      type: `json`
    },
    o2: {
      required: true,
      type: `json`
    }
  },

  fn: async function (inputs, exits) {
    sails.log.debug(`Helper difference called.`)

    // Determine the differences between two objects
    var o1 = inputs.o1
    var o2 = inputs.o2
    var k; var kDiff
    var diff = {}
    for (k in o1) {
      if (!Object.prototype.hasOwnProperty.call(o1, k)) {
      } else if (typeof o1[k] !== `object` || typeof o2[k] !== `object`) {
        if (!(k in o2) || o1[k] !== o2[k]) {
          diff[k] = o2[k]
        }
      } else if (kDiff === sails.helpers.difference(o1[k], o2[k])) {
        diff[k] = kDiff
      }
    }
    for (k in o2) {
      if (Object.prototype.hasOwnProperty.call(o2, k) && !(k in o1)) {
        diff[k] = o2[k]
      }
    }
    for (k in diff) {
      if (Object.prototype.hasOwnProperty.call(diff, k)) {
        return exits.success(diff)
      }
    }
    return exits.success({})
  }

}
