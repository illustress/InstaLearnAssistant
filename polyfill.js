console.log("Polyfill loading...");

const processPolyfill = {
  env: {
    // TODO: Replace with your actual API Key
    API_KEY: "YOUR_API_KEY_HERE",
    NODE_ENV: "production"
  },
  version: 'v16.0.0',
  nextTick: (cb) => setTimeout(cb, 0)
};

if (typeof globalThis !== 'undefined') {
  globalThis.process = processPolyfill;
} else {
  window.process = processPolyfill;
}

// Minimal Buffer polyfill to prevent SDK initialization errors
if (!window.Buffer) {
  window.Buffer = {
    isBuffer: () => false,
    from: (data) => {
        if (typeof data === 'string') {
            return new TextEncoder().encode(data);
        }
        return new Uint8Array(data);
    } 
  };
}

console.log("Polyfill loaded.");