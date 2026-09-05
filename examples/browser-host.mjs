/** Copy both browser examples into a bundler project. Sanitize before calling;
 * isolate returned HTML before display. A fresh worker bounds its lifetime. */
export function compareInWorker(input, { signal } = {}) {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) {
      reject(signal.reason);
      return;
    }
    const worker = new Worker(
      new URL("./browser-worker.mjs", import.meta.url),
      { type: "module" },
    );
    const stop = () => {
      clearTimeout(timer);
      worker.terminate();
      signal?.removeEventListener("abort", abort);
    };
    const abort = () => {
      stop();
      reject(signal.reason);
    };
    const timer = setTimeout(() => {
      stop();
      reject(new Error("Comparison exceeded the 15-second worker deadline"));
    }, 15000);
    signal?.addEventListener("abort", abort, { once: true });
    worker.onmessage = ({ data }) => {
      stop();
      resolve(data);
    };
    worker.onerror = (event) => {
      stop();
      reject(new Error(event.message));
    };
    try {
      worker.postMessage(input);
    } catch (error) {
      stop();
      reject(error);
    }
  });
}
