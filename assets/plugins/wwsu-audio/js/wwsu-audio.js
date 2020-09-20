/**
 * Class for managing an input audio device.
 *
 * @requires WWSUevents WWSU event emitter
 * @requires window.AudioContext Web Audio API
 * @requires navigator Browser API
 */
class WWSUaudio extends WWSUevents {
	/**
	 * Construct the audio class.
	 *
	 * @param {string} device Set the default device ID
	 */
	constructor(device) {
		super();

		// Make the AudioContext and add vu meter worklet
		window.AudioContext = window.AudioContext || window.webkitAudioContext;
		this.audioContext = new AudioContext();
		this.device = device;
		this.node;
		this.mediaStream;

		this.audioContext.audioWorklet
			.addModule("assets/plugins/wwsu-audio/js/wwsu-meter.js")
			.then(() => {
				this.node = new AudioWorkletNode(this.audioContext, "wwsu-meter");
				this.node.port.onmessage = (event) => {
					let _volume = [0, 0];
					if (event.data.volume) _volume = event.data.volume;
					this.emitEvent("audioVolume", [_volume]);
				};
				this.emitEvent("nodeReady", []);
				this.getStream();
			});
	}

	/**
	 * Change the device for this audio input.
	 *
	 * @param {string} device Device ID
	 */
	changeDevice(device) {
		this.device = device;
		this.emitEvent("audioDeviceChanged", [device]);
		this.getStream();
	}

	/**
	 * Create an audio stream from the device.
	 *
	 * @param {string?} device The audio device to use. Defaults to this.device.
	 */
	getStream() {
		// Get the device
		navigator.mediaDevices
			.getUserMedia({
				audio: {
					deviceId: this.device ? { exact: this.device } : undefined,
					echoCancellation: false,
					channelCount: 2,
				},
				video: false,
			})
			.then((stream) => {
				// Reset stuff
				try {
					this.mediaStream.getTracks().forEach((track) => track.stop());
          this.mediaStream = undefined;
          this.analyser.disconnect(this.node).disconnect(this.audioContext.destination);
					this.analyser = undefined;
				} catch (eee) {
					// ignore errors
				}

				// Set properties and make the media stream / audio analyser.
				this.mediaStream = stream;
				this.analyser = this.audioContext.createMediaStreamSource(stream);

				this.analyser.connect(this.node).connect(this.audioContext.destination);
			});
	}
}
