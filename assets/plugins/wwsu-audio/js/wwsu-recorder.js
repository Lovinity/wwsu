"use strict";

/**
 * This class constructs an input audio device and uses it as an audio recorder for on-air programming.
 *
 * @requires Mp3MediaRecorder for mp3 support of the MediaRecorder API.
 * @requires WWSUaudio The WWSUaudio class for making an input device
 * @requires WWSUevents WWSU event emitter.
 */
class WWSUrecorder extends WWSUevents {
	/**
	 * Construct the audio device.
	 *
	 * @param {MediaStreamAudioDestinationNode} destination The audioContext destination to use (should use the one from wwsu-audio)
	 * @param {string} worker Directory path to the worker file
	 */
	constructor(destination, worker) {
		super();

		this.destination = destination;

		this.encodingTitle;
		this.currentTitle;
		this.pendingTitle;
		this.recorderPending = false;

		// this.worker = new Worker(worker);
		this.blobs = [];

		// Construct the recorder
		this.recorder = new MediaRecorder(this.destination.stream, {
			mimeType: "audio/webm;codecs=opus",
			bitsPerSecond: 64000 * 2, // Opus has a maximum allowed bitrate of 128000, so do 64kbps per channel
		});
		this.recorder.onstart = (e) => {
			this.blobs = [];
			console.log(`Recorder blob memory emptied`);
		};
		this.recorder.ondataavailable = (e) => {
			this.blobs.push(e.data);
			console.log(`Recorder blob stored`);
		};
		this.recorder.onstop = (e) => {
			// let blob = new Blob(this.blobs, { type: "audio/mpeg" });
			let blob = new Blob(this.blobs, { type: "audio/webm;codecs=opus" });
			this.emitEvent("recorderSize", [this.encodingTitle, blob.size]);

			// Do not continue if the blob is empty
			if (!blob.size) {
				this.blobs = [];
				return;
			}

			let fileReader = new FileReader();
			fileReader.onload = (e2) => {
				this.emitEvent("recorderEncoded", [
					this.encodingTitle,
					e2.target.result,
				]);
			};
			fileReader.readAsArrayBuffer(blob);
			this.blobs = [];
		};
	}

	/**
	 * Start a new recording
	 *
	 * @param {string} file File path for the new recording
	 * @param {number} delay Delay starting the new recording by this many milliseconds
	 */
	newRecording(file, delay = 0) {
		const _newRecording = () => {
			// Stop current recording if active
			try {
				if (this.recorder && this.recorder.state === "recording") {
					this.encodingTitle = this.currentTitle;
					this.recorder.stop();
				}
			} catch (e) {
				console.log(e);
			}

			// Start new recording
			try {
				if (this.pendingTitle) {
					this.currentTitle = this.pendingTitle;
					console.dir(this.destination.stream);
					/*
					this.recorder = new window.mp3MediaRecorder.Mp3MediaRecorder(
						this.destination.stream,
						{ worker: this.worker }
					);
					*/
					this.recorder.start(1000 * 60 * 5); // Create a new blob every 5 minutes
					this.emitEvent("recorderStarted", [this.pendingTitle]);
				}
			} catch (e) {
				console.log(e);
			}
		};

		this.pendingTitle = file;

		// Delay if provided
		if (delay <= 0) {
			_newRecording();
		} else if (!this.recorderPending) {
			this.recorderPending = true;
			setTimeout(() => {
				_newRecording();
				this.recorderPending = false;
			}, delay);
		}
	}

	/**
	 * Stop recording.
	 *
	 * @param {number} delay Number of milliseconds to delay until recording is stopped.
	 */
	stopRecording(delay = 0) {
		let _stopRecording = () => {
			try {
				// Stop recording if not pending to start a new one
				if (
					this.recorder &&
					this.recorder.state === "recording" &&
					(!this.recorderPending || delay <= 0)
				) {
					this.encodingTitle = this.currentTitle;
					this.recorder.stop();
					this.emitEvent("recorderStopped", [this.encodingTitle]);
				} else {
					this.emitEvent("recorderStopped", [null]);
				}
			} catch (e) {
				this.emitEvent("recorderStopped", [null]);
				console.log(e);
			}
		};

		if (delay <= 0) {
			_stopRecording();
		} else {
			setTimeout(() => {
				_stopRecording();
			}, delay);
		}
	}
}
