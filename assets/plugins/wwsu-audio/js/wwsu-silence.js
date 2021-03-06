'use strict';

/**
 * This class implements the silence detection system.
 * It is expected to handle silence via the audioVolume event.
 *
 * @requires WWSUaudio The WWSUaudio class for making an input device
 * @requires WWSUevents WWSU event emitter.
 */
class WWSUsilenceaudio extends WWSUevents {
	/**
	 * Construct the class.
	 *
	 * @param {AudioContext} audioContext The audioContext to use (should use the one from wwsu-audio if possible)
	 * @param {MediaStreamAudioDestinationNode} destination The destination node to use (should use the audioContext one)
	 */
	constructor(audioContext, destination) {
		super();

		this.audioContext = audioContext;
		this.destination = destination;

		// Add VU meter audio worklet
		this.audioContext.audioWorklet
			.addModule("assets/plugins/wwsu-audio/js/wwsu-meter.js")
			.then(() => {
				this.worklet = new AudioWorkletNode(this.audioContext, "wwsu-meter");
				this.worklet.port.onmessage = (event) => {
					let _volume = [0, 0];
					if (event.data.volume) _volume = event.data.volume;
					this.emitEvent("audioVolume", [_volume]);
				};
				this.emitEvent("deviceWorkletReady", [true]);

				console.dir(this.destination.stream);

				this.analyser = this.audioContext.createMediaStreamSource(
					this.destination.stream
				);

				this.analyser
					.connect(this.worklet)
					.connect(this.audioContext.destination);
			});
	}
}
