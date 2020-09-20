(function(g,f){typeof exports==='object'&&typeof module!=='undefined'?f(exports):typeof define==='function'&&define.amd?define(['exports'],f):(g=g||self,f(g.mp3EncoderWorker={}));}(this,(function(exports){'use strict';/*! *****************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}const initMp3MediaEncoder = ({ vmsgWasmUrl }) => {
    // from vmsg
    // Must be in sync with emcc settings!
    const TOTAL_STACK = 5 * 1024 * 1024;
    const TOTAL_MEMORY = 128 * 1024 * 1024;
    const WASM_PAGE_SIZE = 64 * 1024;
    const ctx = self;
    const memory = new WebAssembly.Memory({
        initial: TOTAL_MEMORY / WASM_PAGE_SIZE,
        maximum: TOTAL_MEMORY / WASM_PAGE_SIZE
    });
    let dynamicTop = TOTAL_STACK;
    let imports = { env: {
            memory,
            sbrk: (increment) => {
                const oldDynamicTop = dynamicTop;
                dynamicTop += increment;
                return oldDynamicTop;
            },
            exit: () => ctx.postMessage({ type: 'ERROR', error: 'internal' }),
            pow: Math.pow,
            powf: Math.pow,
            exp: Math.exp,
            sqrtf: Math.sqrt,
            cos: Math.cos,
            log: Math.log,
            sin: Math.sin
        } };
    const vmsg = getWasmModule(vmsgWasmUrl, imports).then(wasm => wasm.instance.exports);
    let isRecording = false;
    let vmsgRef;
    let pcmLeft;
    function getWasmModuleFallback(url, imports) {
        return fetch(url)
            .then(response => response.arrayBuffer())
            .then(buffer => WebAssembly.instantiate(buffer, imports));
    }
    function getWasmModule(url, imports) {
        if (!WebAssembly.instantiateStreaming) {
            return getWasmModuleFallback(url, imports);
        }
        return WebAssembly.instantiateStreaming(fetch(url), imports).catch(() => getWasmModuleFallback(url, imports));
    }
    const onStartRecording = (config) => __awaiter(void 0, void 0, void 0, function* () {
        const vmsgInstance = yield vmsg;
        isRecording = true;
        vmsgRef = vmsgInstance.vmsg_init(config.sampleRate);
        if (!vmsgRef || !vmsgInstance) {
            throw new Error('init_failed');
        }
        const pcmLeftRef = new Uint32Array(memory.buffer, vmsgRef, 1)[0];
        pcmLeft = new Float32Array(memory.buffer, pcmLeftRef);
    });
    const onStopRecording = () => __awaiter(void 0, void 0, void 0, function* () {
        const vmsgInstance = yield vmsg;
        isRecording = false;
        if (vmsgInstance.vmsg_flush(vmsgRef) < 0) {
            throw new Error('flush_failed');
        }
        const mp3BytesRef = new Uint32Array(memory.buffer, vmsgRef + 4, 1)[0];
        const size = new Uint32Array(memory.buffer, vmsgRef + 8, 1)[0];
        const mp3Bytes = new Uint8Array(memory.buffer, mp3BytesRef, size);
        const blob = new Blob([mp3Bytes], { type: 'audio/mpeg' });
        vmsgInstance.vmsg_free(vmsgRef);
        return blob;
    });
    const onDataReceived = (data) => __awaiter(void 0, void 0, void 0, function* () {
        if (!isRecording) {
            return;
        }
        pcmLeft.set(data);
        const vmsgInstance = yield vmsg;
        const encodedBytesAmount = vmsgInstance.vmsg_encode(vmsgRef, data.length);
        if (encodedBytesAmount < 0) {
            throw new Error('encoding_failed');
        }
    });
    ctx.addEventListener('message', (event) => __awaiter(void 0, void 0, void 0, function* () {
        const message = event.data;
        try {
            switch (message.type) {
                case 'START_RECORDING': {
                    yield onStartRecording(message.config);
                    ctx.postMessage({ type: 'WORKER_RECORDING' });
                    break;
                }
                case 'DATA_AVAILABLE': {
                    yield onDataReceived(message.data);
                    break;
                }
                case 'STOP_RECORDING': {
                    const blob = yield onStopRecording();
                    ctx.postMessage({ type: 'BLOB_READY', blob });
                    break;
                }
            }
        }
        catch (err) {
            ctx.postMessage({ type: 'ERROR', error: err.message });
        }
    }));
};exports.initMp3MediaEncoder=initMp3MediaEncoder;Object.defineProperty(exports,'__esModule',{value:true});})));//# sourceMappingURL=index.umd.js.map
