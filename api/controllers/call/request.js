module.exports = {
  friendlyName: "Call / Request",

  description:
    "When a DJ Controls wants to initiate a remote audio call for a remote broadcast, it should call this endpoint to tell the other DJ Controls to load its remote audio process.",

  inputs: {
    ID: {
      type: "number",
      required: true,
      description: "The host ID that this DJ Controls wants to call."
    }
  },

  exits: {},

  fn: async function(inputs) {
    // Integrity check: Reject if we are in a remote state or pending a remote state
    if (
      sails.models.meta.memory.state.startsWith("remote_") ||
      sails.models.meta.memory.state.startsWith("sportsremote_") ||
      sails.models.meta.memory.state === "automation_remote" ||
      sails.models.meta.memory.state === "automation_sportsremote"
    )
      return new Error(
        "Cannot request an audio call when a remote broadcast is in progress."
      );

    // Integrity check: Make sure this DJ Controls is allowed to call
    if (!this.req.payload.makeCalls)
      return new Error("This host is not allowed to start audio calls");

    // Integrity checks: Make sure the host we want to call exists, is authorized, and allowed to be called
    let record = await sails.models.hosts.findOne({ ID: inputs.ID });
    if (!record) return new Error("The provided host ID was not found");
    if (!record.authorized)
      return new Error(
        "The provided host is not authorized to connect to WWSU"
      );
    if (!record.answerCalls)
      return new Error(
        "The provided host is not allowed to answer audio calls"
      );

    // At this point, all is well. Update the hosts in meta.
    // The meta change delivered via sockets to DJ Controls should trigger the other DJ Controls to load its remote process.
    // And once it reports a peer in recipients, that should be delivered in sockets back to the calling DJ Controls, who will then initiate the call.
    await sails.helpers.meta.change.with({
      hostCalling: this.req.payload.ID,
      hostCalled: inputs.ID
    });
  }
};
