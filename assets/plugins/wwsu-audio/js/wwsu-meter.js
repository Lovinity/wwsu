'use strict';

// Create an Audio node and meter/processor from the audio worklet

const SMOOTHING_FACTOR = 0.98;
const MINIMUM_VALUE = 0.00001;

registerProcessor(
	"wwsu-meter",
	class extends AudioWorkletProcessor {
		_volume;
		_updateIntervalInMS;
		_nextUpdateFrame;

		constructor() {
			super();
			this._volume = [-1, -1];
			this._updateIntervalInMS = 60;
			this._nextUpdateFrame = this._updateIntervalInMS;
			this.port.onmessage = (event) => {
				if (event.data.updateIntervalInMS)
					this._updateIntervalInMS = event.data.updateIntervalInMS;
				if (event.data.destroy) {
					this._destroyed = true;
				}
			};
			this._destroyed = false;
		}

		get intervalInFrames() {
			return (this._updateIntervalInMS / 1000) * sampleRate;
		}

		process(inputs, outputs, parameters) {
			const input = inputs[0];

			// Note that the input will be down-mixed to mono; however, if no inputs are
			// connected then zero channels will be passed in.
			if (input.length > 0) {
				for (let inp in input) {
					let samples = input[inp];
					let sum = 0;
					let rms = 0;

					// Calculated the squared-sum.
					for (let i = 0; i < samples.length; ++i)
						sum += samples[i] * samples[i];

					// Calculate the RMS level and update the volume.
					rms = samples.length > 0 ? Math.sqrt(sum / samples.length) : 0;
					this._volume[inp] = Math.max(
						rms,
						this._volume[inp] * SMOOTHING_FACTOR
					);

					this._nextUpdateFrame -= samples.length;
				}

				// Update and sync the volume property with the main thread.
				if (this._nextUpdateFrame < 0) {
					this._nextUpdateFrame += this.intervalInFrames;
					this.port.postMessage({ volume: this._volume });
				}
			}

			return !this._destroyed;
		}
	}
);
