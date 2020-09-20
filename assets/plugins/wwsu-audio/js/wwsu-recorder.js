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
	 * @param {string} worker Directory path to the workewr file
	 * @param {string} device The input device to use initially.
	 */
	constructor(worker, device) {
		super();

		this.device = device;
		this.encodingTitle;
		this.currentTitle;
		this.pendingTitle;
		this.recorderPending = false;

		this.worker = new Worker(worker);
		this.blobs = [];

		this.recorder;

		this.audio = new WWSUaudio(this.device);

		this.emitEvent("recorderReady", []);
	}

	/**
	 * Start a new recording
	 *
	 * @param {string} file File path for the new recording
	 * @param {number} delay Delay starting the new recording by this many milliseconds
	 */
	newRecording(file, delay = 0) {
		var _newRecording = () => {
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
					this.recorder = new window.mp3MediaRecorder.Mp3MediaRecorder(
						this.audio.mediaStream,
						{ worker: this.worker }
					);
					this.recorder.start();
					this.emitEvent("recorderStarted", [this.pendingTitle]);

					this.recorder.onstart = (e) => {
						this.blobs = [];
					};

					this.recorder.ondataavailable = (e) => {
						this.blobs.push(e.data);
					};

					this.recorder.onstop = (e) => {
						let mp3Blob = new Blob(this.blobs, { type: "audio/mpeg" });
						let fileReader = new FileReader();
						fileReader.onload = (e2) => {
							this.emitEvent("recorderEncoded", [
								this.encodingTitle,
								e2.target.result,
							]);
						};
						fileReader.readAsArrayBuffer(mp3Blob);
					};
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
		var _stopRecording = () => {
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
