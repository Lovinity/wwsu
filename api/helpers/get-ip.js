module.exports = {


  friendlyName: 'sails.helpers.getIp()',


  description: 'Determine what the IP address is of a request',


  inputs: {
      req: {
          type: 'ref',
          required: true,
          description: 'The req object to check the IP for.'
      }
  },


  fn: async function (inputs, exits) {

      return exits.success(inputs.req.isSocket ? (typeof inputs.req.socket.handshake.headers['x-forwarded-for'] !== 'undefined' ? inputs.req.socket.handshake.headers['x-forwarded-for'] : inputs.req.socket.conn.remoteAddress) : inputs.req.ip);

  }


};

