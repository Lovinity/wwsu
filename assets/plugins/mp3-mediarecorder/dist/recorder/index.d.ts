/// <reference types="dom-mediacapture-record" />
import { EventTarget } from 'event-target-shim';
export interface Mp3MediaRecorderOptions extends MediaRecorderOptions {
    worker: Worker;
    audioContext?: AudioContext;
}
export declare class Mp3MediaRecorder extends EventTarget {
    stream: MediaStream;
    mimeType: string;
    state: RecordingState;
    audioBitsPerSecond: number;
    videoBitsPerSecond: number;
    private audioContext;
    private sourceNode;
    private gainNode;
    private processorNode;
    private worker;
    private isInternalAudioContext;
    static isTypeSupported: (mimeType: string) => boolean;
    constructor(stream: MediaStream, { audioContext, worker }: Mp3MediaRecorderOptions);
    start(): void;
    stop(): void;
    pause(): void;
    resume(): void;
    requestData(): void;
    private getStateError;
    private onWorkerMessage;
}
declare module './index' {
    interface Mp3MediaRecorder extends Pick<MediaRecorder, 'onstart' | 'onstop' | 'onpause' | 'onresume' | 'ondataavailable' | 'onerror'> {
    }
}
//# sourceMappingURL=index.d.ts.map