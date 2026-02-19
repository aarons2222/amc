const AlexaRemote = require('alexa-remote2');
const config = require('./config');

let instance = null;

function connect() {
  return new Promise((resolve, reject) => {
    if (instance) return resolve(instance);

    const cookie = config.get('cookie');
    if (!cookie) {
      reject(new Error('Not authenticated. Run: amc auth'));
      return;
    }

    const alexa = new AlexaRemote();
    alexa.init(
      {
        cookie,
        alexaServiceHost: 'alexa.amazon.co.uk',
        amazonPageHost: 'www.amazon.co.uk',
        listeningPort: 10010,
        cookieRefreshInterval: 0,
        proxyOnly: false,
        setupProxy: false,
      },
      (err) => {
        if (err) {
          // Cookie might be stale
          reject(new Error(`Connection failed: ${err.message || err}\nTry re-authenticating: amc auth`));
          return;
        }
        instance = alexa;
        // Save refreshed cookie if updated
        if (alexa.cookieData) config.set('cookie', alexa.cookieData);
        resolve(alexa);
      }
    );
  });
}

function getDevices(alexa) {
  return new Promise((resolve, reject) => {
    alexa.getDevices((err, data) => {
      if (err) return reject(err);
      const devices = (data?.devices || []).filter(
        (d) => d.capabilities?.some((c) => c.interfaceName === 'AUDIO_PLAYER') ||
               d.deviceFamily === 'ECHO'
      );
      resolve(devices);
    });
  });
}

function findDevice(alexa, name) {
  return new Promise(async (resolve, reject) => {
    const devices = await getDevices(alexa).catch(reject);
    if (!devices) return;
    if (!name) {
      const def = config.get('defaultDevice');
      if (def) {
        const found = devices.find(
          (d) => d.serialNumber === def || d.accountName?.toLowerCase() === def.toLowerCase()
        );
        if (found) return resolve(found);
      }
      if (devices.length === 1) return resolve(devices[0]);
      reject(new Error('Multiple devices found. Specify one with -d <name> or set default: amc default <name>'));
      return;
    }
    const found = devices.find(
      (d) =>
        d.accountName?.toLowerCase().includes(name.toLowerCase()) ||
        d.serialNumber === name
    );
    if (!found) reject(new Error(`Device not found: "${name}". Run amc devices to list available devices.`));
    else resolve(found);
  });
}

module.exports = { connect, getDevices, findDevice };
