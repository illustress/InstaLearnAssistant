// Storage abstraction — uses chrome.storage in extension, localStorage as fallback for dev

const hasExtensionStorage = typeof chrome !== 'undefined' && !!chrome.storage;

export const syncStore = {
  async get(keys) {
    if (hasExtensionStorage && chrome.storage.sync) {
      return new Promise(resolve => chrome.storage.sync.get(keys, resolve));
    }
    const result = {};
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(k => {
      try {
        const v = window.localStorage.getItem(`il_${k}`);
        if (v !== null) result[k] = JSON.parse(v);
      } catch (e) { /* ignore */ }
    });
    return result;
  },
  async set(data) {
    if (hasExtensionStorage && chrome.storage.sync) {
      return new Promise(resolve => chrome.storage.sync.set(data, resolve));
    }
    Object.entries(data).forEach(([k, v]) => {
      window.localStorage.setItem(`il_${k}`, JSON.stringify(v));
    });
  }
};

export const localStore = {
  async get(keys) {
    if (hasExtensionStorage && chrome.storage.local) {
      return new Promise(resolve => chrome.storage.local.get(keys, resolve));
    }
    const result = {};
    const keyList = Array.isArray(keys) ? keys : [keys];
    keyList.forEach(k => {
      try {
        const v = window.localStorage.getItem(`il_local_${k}`);
        if (v !== null) result[k] = JSON.parse(v);
      } catch (e) { /* ignore */ }
    });
    return result;
  },
  async set(data) {
    if (hasExtensionStorage && chrome.storage.local) {
      return new Promise(resolve => chrome.storage.local.set(data, resolve));
    }
    Object.entries(data).forEach(([k, v]) => {
      window.localStorage.setItem(`il_local_${k}`, JSON.stringify(v));
    });
  }
};
