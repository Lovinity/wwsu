'use strict';

/**
 * Manager for audio devices
 */
class WWSUAudioManager extends WWSUevents {
	/**
	 *
	 * @param {?string} limiter If a limiter should be applied, the path to the audioWorklet module should be specified
	 */
	constructor(limiter) {
		super();

		this.inputs = new Map();
		this.outputs = new Map();
		this.volumes = new Map();

		// Create audio context
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		this.audioContext = new AudioContext();
		this.destination = this.audioContext.createMediaStreamDestination();

		// Create limiter if specified
		if (limiter) {
			this.audioContext.audioWorklet.addModule(limiter).then(() => {
				this.worklet = new AudioWorkletNode(this.audioContext, "wwsu-limiter");
			});
		}

		this.volumeSend = setInterval(() => {
			this.emitEvent("audioVolume", [this.volumes]);
		}, 60);

		// Load available devices
		this.loadDevices();
	}

	/**
	 * Load available audio devices and disconnect all existing ones.
	 * Devices are emitted as "devices" event when loaded. You should use this to determine which devices to connect() to audioContext.
	 */
	loadDevices() {
		// Disconnect devices and reset
		if (this.inputs.size > 0) {
			this.inputs.forEach((device) => {
				device.disconnect();
			});
		}
		if (this.outputs.size > 0) {
			this.outputs.forEach((device) => {
				device.disconnect();
			});
		}
		this.inputs = new Map();
		this.outputs = new Map();
		this.volumes = new Map();

		// Grab available devices
		navigator.mediaDevices.enumerateDevices().then((devices) => {
			let _devices = devices.map((device) => {
				// Input devices
				if (device.kind === "audioinput") {
					let wwsuaudio = new WWSUAudioInput(
						device,
						this.audioContext,
						this.destination
					);
					wwsuaudio.on("audioVolume", "WWSUAudioManager", (volume) => {
						this.volumes.set(device.deviceId, volume);
					});

					this.inputs.set(device.deviceId, wwsuaudio);

					// Output devices
				} else if (device.kind === "audiooutput") {
					let wwsuaudio = new WWSUAudioOutput(device, this.audioContext);

					this.outputs.set(device.deviceId, wwsuaudio);
				}

				return device;
			});
			this.emitEvent("devices", [_devices]);
		});
	}

	/**
	 * Change the volume of a device.
	 *
	 * @param {string} deviceId The device ID to change volume.
	 * @param {string} kind The device kind
	 * @param {number} volume The new volume to set at (between 0 and 1);
	 */
	changeVolume(deviceId, kind, volume) {
		let device = kind === "audioinput" ? this.inputs.get(deviceId) : this.outputs.get(deviceId);
		if (device) {
			device.changeVolume(volume);
		}
	}

	/**
	 * Disconnect a device from the audioContext, but leave the device in the device map.
	 *
	 * @param {string} deviceId The device to disconnect
	 * @param {string} kind The device kind
	 */
	disconnect(deviceId, kind) {
		let device = kind === "audioinput" ? this.inputs.get(deviceId) : this.outputs.get(deviceId);
		if (device) {
			device.disconnect();
		}
	}

	/**
	 * Connect a device to the audioContext. Device must be in the inputs or outputs map.
	 *
	 * @param {string} deviceId The ID of the device to connect
	 * @param {string} kind The device kind
	 * @param {string} module Path to the wwsu-meter audio worklet module
	 */
	connect(deviceId, kind, module) {
		let device = kind === "audioinput" ? this.inputs.get(deviceId) : this.outputs.get(deviceId);
		if (device) {
			device.connect(module);
		}
	}
}

// Class for an audio input device.
class WWSUAudioInput extends WWSUevents {
	/**
	 * Construct the device.
	 *
	 * @param {MediaDeviceInfo} device The device
	 * @param {AudioContext} audioContext The audioContext to use for this device
	 * @param {MediaStreamAudioDestinationNode} connectNode The destination node to connect to
	 */
	constructor(device, audioContext, connectNode) {
		super();

		this.device = device;
		this.audioContext = audioContext;
		this.connectNode = connectNode;

		this.stream;
		this.analyser;
		this.worklet;

		// Create gain node (does not set initial value; use this.changeVolume)
		this.gain = this.audioContext.createGain();
	}

	/**
	 * Make a stream, which connects to the wwsu-meter audio worklet and the this.gain node.
	 *
	 * @param {string} module Path to wwsu-meter worklet node module
	 */
	connect(module) {
		console.log(`Connecting ${this.device.deviceId}`);
		this.audioContext.audioWorklet.addModule(module).then(() => {
			this.worklet = new AudioWorkletNode(this.audioContext, "wwsu-meter");
			this.worklet.port.onmessage = (event) => {
				let _volume = [0, 0];
				if (event.data.volume) _volume = event.data.volume;
				this.emitEvent("audioVolume", [_volume]);
			};
			this.emitEvent("deviceWorkletReady", [true]);

			// Get the device media stream
			navigator.mediaDevices
				.getUserMedia({
					audio: {
						deviceId: this.device ? { exact: this.device.deviceId } : undefined,
						echoCancellation: false,
						channelCount: 2,
					},
					video: false,
				})
				.then((stream) => {
					this.stream = stream;
					this.analyser = this.audioContext.createMediaStreamSource(stream);
					this.analyser.connect(this.gain);
					this.gain.connect(this.worklet);
					this.gain.connect(this.connectNode);
					this.worklet.connect(this.audioContext.destination);
				});
		});
	}

	/**
	 * Disconnect media.
	 */
	disconnect() {
		// Reset stuff
		console.log(`Disconnecting ${this.device.deviceId}`);
		try {
			this.stream.getTracks().forEach((track) => track.stop());
			this.stream = undefined;

			this.analyser.disconnect();
			this.gain.disconnect();
			this.worklet.disconnect();

			this.analyser = undefined;
			this.worklet.port.postMessage({ destroy: true });
			this.worklet = undefined;
		} catch (eee) {
			// ignore errors
		}
	}

	/**
	 * Change device volume / gain.
	 *
	 * @param {number} gain New gain value
	 */
	changeVolume(gain) {
		this.gain.gain.setValueAtTime(gain, this.audioContext.currentTime);
	}
}

// Class for an audio output device.
class WWSUAudioOutput extends WWSUevents {
	/**
	 * Construct the device.
	 *
	 * @param {MediaDeviceInfo} device The device
	 * @param {AudioContext} audioContext The audioContext to use for this device
	 */
	constructor(device, audioContext) {
		super();

		this.device = device;
		this.audioContext = audioContext;

		// Create gain node (does not set initial value; use this.changeVolume)
		this.gain = this.audioContext.createGain();
	}

	/**
	 * Make a stream, which connects to the wwsu-meter audio worklet and the this.gain node.
	 *
	 * @param {string} module Path to wwsu-meter worklet node module
	 */
	connect(module) {}

	/**
	 * Disconnect media.
	 */
	disconnect() {}

	/**
	 * Change device volume / gain.
	 *
	 * @param {number} gain New gain value
	 */
	changeVolume(gain) {
		this.gain.gain.setValueAtTime(gain, this.audioContext.currentTime);
	}
}
