const hmac = require("crypto-js/hmac-sha256");
const CryptoJS = require("crypto-js");
const sh = require("shorthash");

module.exports = {
  friendlyName: "Call / credential-computer",

  description:
    "Receive a credential to connect to Skyway.js from an authorized host. ",

  inputs: {},

  exits: {},

  fn: async function(inputs) {
    // Get current time
    const unixTimestamp = Math.floor(Date.now() / 1000);

    // Create the Peer ID that should be used
    let peerId = `WWSU-computer-${sh.unique(
      this.req.payload.host + sails.config.custom.hostSecret
    )}-${sh.unique(Date.now() + sails.config.custom.hostSecret)}`;

    // Create the credential
    const credential = {
      peerId: peerId,
      timestamp: unixTimestamp,
      ttl: 60 * 60 * 24, // 24 hours
      authToken: calculateAuthToken(peerId, unixTimestamp),
      apiKey: sails.config.custom.skyway.api
    };

    return credential;
  }
};

function calculateAuthToken(peerId, timestamp) {
  // calculate the auth token hash
  const hash = CryptoJS.HmacSHA256(
    `${timestamp}:${60 * 60 * 24}:${peerId}`,
    sails.config.custom.skyway.secret
  );

  // convert the hash to a base64 string
  return CryptoJS.enc.Base64.stringify(hash);
}
