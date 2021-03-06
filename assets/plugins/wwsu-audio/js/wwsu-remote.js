"use strict";

/**
 * This class implements remote broadcasting.
 * For the module that hits the WWSU API, use wwsu-remote/wwsu-remote (the WWSURemote class) instead.
 *
 * @requires WWSUaudio The WWSUaudio class for making an input device
 * @requires WWSUevents WWSU event emitter.
 * @requires skywayjs The peer-to-peer system for audio calling.
 * @requires jQuery
 */
class WWSUremoteaudio extends WWSUevents {
	/**
	 * Construct the class.
	 *
	 * @param {AudioContext} audioContext The audioContext to use (should use the one from wwsu-audio if possible)
	 * @param {MediaStreamAudioDestinationNode} destination The destination node to use (should use the audioContext one)
	 * @param {object} device The settings for the output device
	 */
	constructor(audioContext, destination, device) {
		super();

		this.audioContext = audioContext;
		this.destination = destination;
		this.device = device;

		// Peer variables
		this.peer; // Our skyway.js peer
		this.calling; // Peer ID we are calling
		this.callingTimer;
		this.outgoingCall; // Active outgoing call
		this.incomingCalls = new Map(); // Map of active or pending incoming calls
		this.PLC = new Map(); // To keep track of call quality

		this.muted = true; // Should incoming calls be muted? Start off true as a default until this.mute is called.

		// Add VU meter audio worklet
		this.audioContext.audioWorklet
			.addModule("assets/plugins/wwsu-audio/js/wwsu-meter.js")
			.then(() => {
				let lastProcess = window.performance.now();
				let rtcStats = 0;

				this.worklet = new AudioWorkletNode(this.audioContext, "wwsu-meter");
				this.worklet.port.onmessage = (event) => {
					let _volume = [-1, -1];
					if (event.data.volume) _volume = event.data.volume;
					this.emitEvent("audioVolume", [_volume]);

					// Check for glitches in peer audio every second
					rtcStats -= window.performance.now() - lastProcess;
					lastProcess = window.performance.now();
					if (rtcStats <= 0 && this.peer && this.peer.connections) {
						rtcStats = 1000;
						for (let connection in this.peer.connections) {
							// if (connections.hasOwnProperty(connection))
							// {
							if (this.peer.connections[connection].length > 0) {
								this.peer.connections[connection].map(
									(connectionObject, index) => {
										// console.dir(connectionObject);
										try {
											connectionObject._negotiator._pc.getStats((connStats) => {
												let rtcStatsReports = connStats.result();
												rtcStatsReports
													.filter((stat) => stat.type === `ssrc`)
													.map((stat) => {
														let properties = stat.names();
														properties
															.filter(
																(property) => property === `googDecodingPLC`
															)
															.map((property) => {
																let value = stat.stat(property);

																// Get the previous value for this connection
																let prevPLC =
																	this.PLC.get(`${connection}-${index}`) ||
																	this.PLC.set(`${connection}-${index}`, value);

																// Choppiness was detected in the last second. Emit event peerPLC.
																if (value > prevPLC) {
																	this.emitEvent("peerPLC", [
																		`${connection}`,
																		value - prevPLC,
																	]);
																}
																this.PLC.set(`${connection}-${index}`, value);
															});
													});
											});
										} catch (e) {
											console.error(e); // TODO: remove when this is working
										}
									}
								);
							}
							// }
						}
					}
				};
				this.emitEvent("deviceWorkletReady", [true]);

				this.analyser = this.audioContext.createMediaStreamSource(
					this.destination.stream
				);

				this.analyser
					.connect(this.worklet)
					.connect(this.audioContext.destination);
			});
	}

	/**
	 * Initialize the skyway.js peer.
	 *
	 * @param {string} peerId The Peer ID to use. Must be what was authenticated via the credential parameter.
	 * @param {string} apiKey The API Key for the Skyway.js app
	 * @param {object} credential The authenticated credential object to ensure authorized use of this Skyway.js
	 */
	init(peerId, apiKey, credential) {
		try {
			this.peer.destroy();
			this.peer = undefined;
		} catch (ee) {
			// Ignore errors
		}

		// Inisialize Skyway.js peer
		this.peer = new Peer(peerId, {
			key: apiKey,
			credential: credential,
			debug: 3,
		});

		// When peer is opened, emit the peer ID via the peerReady event
		this.peer.on("open", (id) => {
			console.log(`peer opened with id ${id}`);
			this.emitEvent("peerReady", [id]);
		});

		// When an error occurs for the peer, emit events
		// TODO in renderer
		this.peer.on("error", (err) => {
			console.error(err);

			// Other peer is not available to receive a call
			if (err.type === `peer-unavailable`) {
				this.emitEvent("peerUnavailable", [this.calling]);
				try {
					this.calling = undefined;
					// TODO
				} catch (ee) {}
			} else {
				// Other peer errors
				this.emitEvent("peerError", [err]);
			}
		});

		// When the peer gets disconnected, emit either peerDisconnected or peerDestroyed
		this.peer.on(`disconnected`, () => {
			if (this.peer && !this.peer.destroyed) {
				this.emitEvent("peerDisconnected", []);
			} else {
				this.emitEvent("peerDestroyed", []);
			}
		});

		// When the peer is closed, emit peerDestroyed
		this.peer.on("close", () => {
			console.log(`Peer destroyed.`);
			try {
				this.emitEvent("peerDestroyed", []);
				this.peer = undefined;
			} catch (ee) {}
		});

		// When the peer receives a request for an incoming call, emit peerCall event so renderers can check if we should answer it
		// Reject automatically after 30 seconds
		this.peer.on("call", (connection) => {
			console.log(`Incoming call from ${connection.remoteId}`);
			this.incomingCalls.set(connection.remoteId, connection);
			this.emitEvent("peerCall", [connection.remoteId]);
		});
	}

	/**
	 * Start an outgoing call to another peer
	 *
	 * @param {string} peer ID of the skyway.js peer to call
	 */
	call(peer) {
		// Do not continue if already in a call with this peer
		let incomingCall = this.incomingCalls.get(peer);
		if (
			incomingCall ||
			(this.outgoingCall && this.outgoingCall.remoteId === peer)
		)
			return;

		this.calling = peer;

		try {
			// Terminate any existing outgoing calls first
			if (this.outgoingCall) {
				clearInterval(this.outgoingCallTimer);
				this.outgoingCall.close();
				this.outgoingCall = undefined;
			}
		} catch (ee) {}

		// Initialize the call
		this.outgoingCall = this.peer.call(this.calling, this.destination.stream, {
			audioBandwidth: 128,
		});

		this.outgoingCallTimer = setInterval(() => {
			if (this.outgoingCall.open) {
				this.emitEvent("peerCallEstablished", [this.calling]);
				clearInterval(this.outgoingCallTimer);
			}
		}, 1000);

		// When the call is closed, emit peerCallClosed event
		this.outgoingCall.on(`close`, () => {
			console.log(`CALL CLOSED.`);
			clearInterval(this.outgoingCallTimer);
			this.outgoingCall = undefined;
			this.emitEvent("peerCallClosed", [this.calling]);
			this.calling = undefined;
		});
	}

	/**
	 * Hang up an incoming call
	 *
	 * @param {string} peer The peer to hang up
	 */
	hangup(peer) {
		try {
			// Close any active incoming calls by the same peer
			let incomingCall = this.incomingCalls.get(peer);
			if (incomingCall && incomingCall.open) {
				if (incomingCall.worklet)
					incomingCall.worklet.port.postMessage({ destroy: true });
				incomingCall.close();
				$(`#audio-${peer}`).remove();
				this.incomingCalls.delete(peer);
			}
		} catch (ee) {
			console.error(ee); // TODO: remove when we know this works
		}
	}

	/**
	 * Answer an incoming call.
	 *
	 * @param {string} peer The peer ID to answer
	 * @param {?MediaStream} stream Media stream to send over to the call (undefined: receive only)
	 */
	answer(peer, stream) {
		// Hang up active calls by the same peer first so we do not have multiple calls
		this.hangup(peer);

		// Find the pending call in memory
		let incomingCall = this.incomingCalls.get(peer);
		if (!incomingCall) return;

		// Hang the call up if we do not have an output device set
		if (!this.device) return;

		// Answer the call
		incomingCall.answer(stream, {
			audioBandwidth: 128,
			audioReceiveEnabled: true,
		});

		// Construct a VU meter worklet on the incoming stream
		this.audioContext.audioWorklet
			.addModule("assets/plugins/wwsu-audio/js/wwsu-meter.js")
			.then(() => {
				incomingCall.worklet = new AudioWorkletNode(
					this.audioContext,
					"wwsu-meter"
				);
				incomingCall.worklet.port.onmessage = (event) => {
					let _volume = [-1, -1];
					if (event.data.volume) _volume = event.data.volume;
					this.emitEvent("peerIncomingCallVolume", [peer, _volume]);
				};

				incomingCall.worklet.connect(this.audioContext.destination);
			});

		// When a stream is received from the incoming call, connect it
		incomingCall.on("stream", (stream) => {
			this.onReceiveStream(peer, stream);
			this.emitEvent("peerCallAnswered", [peer]);
		});

		// When the incoming call is closed, clean up and emit the peerIncomingCallClosed event
		incomingCall.on(`close`, () => {
			console.log(`CALL CLOSED.`);

			// Fully hang it up
			if (incomingCall.worklet)
				incomingCall.worklet.port.postMessage({ destroy: true });
			$(`#audio-${peer}`).remove();

			this.emitEvent("peerIncomingCallClosed", [peer]);
			this.incomingCalls.delete(peer);
		});
	}

	/**
	 * When a stream begins on an incoming call
	 *
	 * @param {string} peer The ID of the peer this stream belongs
	 * @param {MediaStream} stream The media stream of the peer
	 */
	onReceiveStream(peer, stream) {
		console.log(`received stream`);

		// Create the audio element
		let audio = document.createElement("audio");
		audio.muted = this.muted;
		audio.srcObject = stream;
		audio.id = `audio-${peer}`;
		audio.volume = this.device.volume;
		document.body.appendChild(audio);
		audio.load();
		audio.setSinkId(this.device.deviceId);
		audio.oncanplay = function (e) {
			audio.play();
		};

		let incomingCall = this.incomingCalls.get(peer);
		if (!incomingCall) return;

		// Connect the stream to the call's audio worklet
		let streamNode = this.audioContext.createMediaStreamSource(stream);
		streamNode.connect(incomingCall.worklet);
	}

	/**
	 * Change the device used to play incoming audio calls.
	 *
	 * @param {string} deviceId ID of the output device to use
	 */
	changeOutputDevice(deviceId) {
		this.device.deviceId = deviceId;
		$("audio").each((index, element) => {
			element.setSinkId(deviceId);
		});
	}

	/**
	 * Change the audio volume of audio playing
	 *
	 * @param {number} volume The gain float
	 */
	changeVolume(volume) {
		this.device.volume = volume;
		$("audio").each((index, element) => {
			element.volume = volume;
		});
	}

	/**
	 * Change the muted state of all incoming audio
	 *
	 * @param {*} muted
	 */
	mute(muted) {
		this.muted = muted;
		$("audio").prop("muted", muted);
	}
}
