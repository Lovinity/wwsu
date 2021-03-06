'use strict';

// Source: https://webaudiotech.com/2016/01/21/should-your-web-audio-app-have-a-limiter/
// Original code: https://webaudiotech.com/sites/limiter_comparison/limiter.js
// Additions by Eliastik (eliastiksofts.com): Stereo and multi-channel support, code simplified in one object class (Limiter)

function DelayBuffer(n) {
	this.n = Math.floor(n);
	this.init();
}

DelayBuffer.prototype.init = function () {
	this._array = new Float32Array(2 * this.n);
	this.length = this._array.length;
	this.readPointer = 0;
	this.writePointer = this.n - 1;

	for (let i = 0; i < this.length; i++) {
		this._array[i] = 0;
	}
};

DelayBuffer.prototype.read = function () {
	let value = this._array[this.readPointer % this.length];
	this.readPointer++;
	return value;
};

DelayBuffer.prototype.push = function (v) {
	this._array[this.writePointer % this.length] = v;
	this.writePointer++;
};

DelayBuffer.prototype.reset = function () {
	this.init();
};

function Limiter(
	sampleRate,
	preGain,
	postGain,
	attackTime,
	releaseTime,
	threshold,
	lookAheadTime
) {
	this.sampleRate = sampleRate || 44100; // Hz
	this.preGain = preGain || 0; // dB
	this.postGain = postGain || 0; // dB
	this.attackTime = attackTime || 0; // s
	this.releaseTime = releaseTime || 1; // s
	this.threshold = threshold || -0.1; // dB
	this.lookAheadTime = lookAheadTime || 0.1; // s
	this.delayBuffer = [];
	this.envelopeSample = 0;

	let obj = this;

	this.getEnvelope = function (data, attackTime, releaseTime, sampleRate) {
		let attackGain = Math.exp(-1 / (sampleRate * attackTime));
		let releaseGain = Math.exp(-1 / (sampleRate * releaseTime));

		let envelope = new Float32Array(data.length);

		for (let i = 0; i < data.length; i++) {
			let envIn = Math.abs(data[i]);

			if (this.envelopeSample < envIn) {
				this.envelopeSample =
					envIn + attackGain * (this.envelopeSample - envIn);
			} else {
				this.envelopeSample =
					envIn + releaseGain * (this.envelopeSample - envIn);
			}

			envelope[i] = this.envelopeSample;
		}

		return envelope;
	};

	this.getMaxEnvelope = function (envelope, channels, index) {
		let max = envelope[0][index];

		for (let channel = 0; channel < channels; channel++) {
			if (envelope[channel][index] > max) {
				max = envelope[channel][index];
			}
		}

		return max;
	};

	this.ampToDB = function (value) {
		return 20 * Math.log10(value);
	};

	this.dBToAmp = function (db) {
		return Math.pow(10, db / 20);
	};

	this.limit = function (inputs, outputs) {
		let input = inputs[0];
		let output = outputs[0];

		input.forEach((data, channel) => {
			// create a delay buffer
			if (obj.delayBuffer[channel] == null) {
				obj.delayBuffer[channel] = new DelayBuffer(
					obj.lookAheadTime * obj.sampleRate
				);
			}

			// apply pre gain to signal
			for (let k = 0; k < data.length; ++k) {
				output[channel][k] = obj.preGain * data[k];
			}

			// compute the envelope
			envelopeData[channel] = obj.getEnvelope(
				output[channel],
				obj.attackTime,
				obj.releaseTime,
				obj.sampleRate
			);
		});

		input.forEach((data, channel) => {
			if (obj.lookAheadTime > 0) {
				// write signal into buffer and read delayed signal
				for (let i = 0; i < output[channel].length; i++) {
					obj.delayBuffer[channel].push(output[channel][i]);
					output[channel][i] = obj.delayBuffer[channel].read();
				}
			}

			// limiter mode: slope is 1
			let slope = 1;

			for (let i = 0; i < data.length; i++) {
				let gainDB =
					slope *
					(obj.threshold -
						obj.ampToDB(obj.getMaxEnvelope(envelopeData, output.length, i))); // max gain
				// is gain below zero?
				gainDB = Math.min(0, gainDB);
				let gain = obj.dBToAmp(gainDB);
				output[channel][i] *= gain * obj.postGain;
			}
		});
	};

	this.reset = function () {
		for (let i = 0; i < this.delayBuffer.length; i++) {
			if (this.delayBuffer[i] != null) {
				this.delayBuffer[i].reset();
			}
		}

		this.envelopeSample = 0;
	};
}

registerProcessor(
	"wwsu-limiter",
	class extends AudioWorkletProcessor {
		constructor() {
			super();

			this.limiter = new Limiter(sampleRate);
		}

		process(inputs, outputs, parameters) {
			this.limiter.limit(inputs, outputs);

			return !this._destroyed;
		}
	}
);
