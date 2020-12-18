import { Mp3WorkerEncodingConfig } from './config.type';
export declare enum PostMessageType {
    DATA_AVAILABLE = "DATA_AVAILABLE",
    START_RECORDING = "START_RECORDING",
    STOP_RECORDING = "STOP_RECORDING",
    ERROR = "ERROR",
    BLOB_READY = "BLOB_READY",
    WORKER_RECORDING = "WORKER_RECORDING"
}
export declare const errorMessage: (error: string) => {
    type: PostMessageType.ERROR;
    error: string;
};
export declare const startRecordingMessage: (config: Mp3WorkerEncodingConfig) => {
    type: PostMessageType.START_RECORDING;
    config: Mp3WorkerEncodingConfig;
};
export declare const workerRecordingMessage: () => {
    type: PostMessageType.WORKER_RECORDING;
};
export declare const dataAvailableMessage: (data: ArrayLike<number>) => {
    type: PostMessageType.DATA_AVAILABLE;
    data: ArrayLike<number>;
};
export declare const blobReadyMessage: (blob: Blob) => {
    type: PostMessageType.BLOB_READY;
    blob: Blob;
};
export declare const stopRecordingMessage: () => {
    type: PostMessageType.STOP_RECORDING;
};
export declare type WorkerPostMessage = ReturnType<typeof errorMessage | typeof startRecordingMessage | typeof dataAvailableMessage | typeof blobReadyMessage | typeof stopRecordingMessage | typeof workerRecordingMessage>;
//# sourceMappingURL=post-message.type.d.ts.map