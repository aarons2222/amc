#!/usr/bin/env node

'use strict';

const { program } = require('commander');
const chalk = require('chalk');
const ora = require('ora');
const AlexaRemote = require('alexa-remote2');
const config = require('../lib/config');
const { connect, getDevices, findDevice } = require('../lib/alexa');

const ok = (msg) => console.log(chalk.green('✓') + ' ' + msg);
const err = (msg) => { console.error(chalk.red('✗') + ' ' + msg); process.exit(1); };
const info = (msg) => console.log(chalk.blue('→') + ' ' + msg);
const dim = (msg) => console.log(chalk.dim(msg));

program
  .name('amc')
  .description('Alexa Media Controller')
  .version('1.0.0');

// ─── AUTH ────────────────────────────────────────────────────────────────────
program
  .command('auth')
  .description('Authenticate with Amazon (opens a local proxy)')
  .action(async () => {
    const PROXY_PORT = 3456;
    info(`Starting auth proxy on http://localhost:${PROXY_PORT}`);
    info('Open that URL in your browser, log in to Amazon, then close the tab.');
    console.log();

    const alexa = new AlexaRemote();
    alexa.init(
      {
        alexaServiceHost: 'alexa.amazon.co.uk',
        amazonPageHost: 'www.amazon.co.uk',
        setupProxy: true,
        proxyOnly: true,
        proxyPort: PROXY_PORT,
        proxyListenBind: '0.0.0.0',
      },
      (e) => {
        if (e) return err(`Auth failed: ${e.message || e}`);
      }
    );

    alexa.on('cookie', (cookie, csrf, macDms) => {
      config.set('cookie', cookie);
      if (csrf) config.set('csrf', csrf);
      ok('Authenticated! Cookie saved to ~/.amc/config.json');
      ok('Run: amc devices  — to see your Alexa devices');
      process.exit(0);
    });
  });

// ─── LOGOUT ──────────────────────────────────────────────────────────────────
program
  .command('logout')
  .description('Remove saved credentials')
  .action(() => {
    config.clear();
    ok('Logged out. Run amc auth to re-authenticate.');
  });

// ─── DEVICES ─────────────────────────────────────────────────────────────────
program
  .command('devices')
  .description('List all Alexa devices on your account')
  .action(async () => {
    const spinner = ora('Fetching devices...').start();
    try {
      const alexa = await connect();
      const devices = await getDevices(alexa);
      spinner.stop();

      if (!devices.length) return info('No playback-capable devices found.');

      const defaultDev = config.get('defaultDevice');
      console.log();
      devices.forEach((d) => {
        const isDefault = d.serialNumber === defaultDev || d.accountName === defaultDev;
        const tag = isDefault ? chalk.cyan(' [default]') : '';
        console.log(
          chalk.bold(d.accountName) + tag +
          chalk.dim(` — ${d.deviceFamily} · ${d.serialNumber}`)
        );
      });
      console.log();
      dim(`Set default: amc default "<device name>"`);
    } catch (e) {
      spinner.stop();
      err(e.message);
    }
  });

// ─── DEFAULT ─────────────────────────────────────────────────────────────────
program
  .command('default <name>')
  .description('Set default device')
  .action(async (name) => {
    const spinner = ora('Looking up device...').start();
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, name);
      spinner.stop();
      config.set('defaultDevice', device.serialNumber);
      ok(`Default device set to: ${chalk.bold(device.accountName)}`);
    } catch (e) {
      spinner.stop();
      err(e.message);
    }
  });

// ─── PLAY ────────────────────────────────────────────────────────────────────
program
  .command('play [query]')
  .description('Play music (Apple Music by default)')
  .option('-d, --device <name>', 'Target device')
  .option('-s, --service <service>', 'Music service (applemusic, spotify, amazon)', 'applemusic')
  .action(async (query, opts) => {
    const spinner = ora(query ? `Playing "${query}"...` : 'Resuming playback...').start();
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      spinner.stop();

      if (query) {
        const text = opts.service === 'applemusic'
          ? `play ${query} on Apple Music`
          : opts.service === 'spotify'
          ? `play ${query} on Spotify`
          : `play ${query}`;

        alexa.sendSequenceCommand(device.serialNumber, 'textCommand', text, (e) => {
          if (e) return err(`Failed: ${e.message || e}`);
          ok(`Playing "${query}" via ${opts.service} on ${chalk.bold(device.accountName)}`);
        });
      } else {
        alexa.sendSequenceCommand(device.serialNumber, 'resume', null, (e) => {
          if (e) return err(`Failed: ${e.message || e}`);
          ok(`Resumed on ${chalk.bold(device.accountName)}`);
        });
      }
    } catch (e) {
      spinner.stop();
      err(e.message);
    }
  });

// ─── PAUSE ───────────────────────────────────────────────────────────────────
program
  .command('pause')
  .description('Pause playback')
  .option('-d, --device <name>', 'Target device')
  .action(async (opts) => {
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      alexa.sendSequenceCommand(device.serialNumber, 'pause', null, (e) => {
        if (e) return err(`Failed: ${e.message || e}`);
        ok(`Paused on ${chalk.bold(device.accountName)}`);
      });
    } catch (e) {
      err(e.message);
    }
  });

// ─── NEXT / PREV ─────────────────────────────────────────────────────────────
program
  .command('next')
  .description('Skip to next track')
  .option('-d, --device <name>', 'Target device')
  .action(async (opts) => {
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      alexa.sendSequenceCommand(device.serialNumber, 'next', null, (e) => {
        if (e) return err(`Failed: ${e.message || e}`);
        ok(`Skipped on ${chalk.bold(device.accountName)}`);
      });
    } catch (e) { err(e.message); }
  });

program
  .command('prev')
  .description('Go to previous track')
  .option('-d, --device <name>', 'Target device')
  .action(async (opts) => {
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      alexa.sendSequenceCommand(device.serialNumber, 'previous', null, (e) => {
        if (e) return err(`Failed: ${e.message || e}`);
        ok(`Previous track on ${chalk.bold(device.accountName)}`);
      });
    } catch (e) { err(e.message); }
  });

// ─── VOLUME ──────────────────────────────────────────────────────────────────
program
  .command('vol <level>')
  .description('Set volume (0-100)')
  .option('-d, --device <name>', 'Target device')
  .action(async (level, opts) => {
    const vol = parseInt(level);
    if (isNaN(vol) || vol < 0 || vol > 100) return err('Volume must be 0-100');
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      alexa.setVolume(device.serialNumber, vol, (e) => {
        if (e) return err(`Failed: ${e.message || e}`);
        ok(`Volume set to ${chalk.bold(vol)} on ${chalk.bold(device.accountName)}`);
      });
    } catch (e) { err(e.message); }
  });

// ─── SAY ─────────────────────────────────────────────────────────────────────
program
  .command('say <text>')
  .description('Make Alexa say something (TTS)')
  .option('-d, --device <name>', 'Target device')
  .action(async (text, opts) => {
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      alexa.sendSequenceCommand(device.serialNumber, 'speak', text, (e) => {
        if (e) return err(`Failed: ${e.message || e}`);
        ok(`Alexa says: "${text}" on ${chalk.bold(device.accountName)}`);
      });
    } catch (e) { err(e.message); }
  });

// ─── ANNOUNCE ────────────────────────────────────────────────────────────────
program
  .command('announce <text>')
  .description('Announce to all Alexa devices')
  .action(async (text) => {
    const spinner = ora('Announcing...').start();
    try {
      const alexa = await connect();
      const devices = await getDevices(alexa);
      spinner.stop();
      let done = 0;
      devices.forEach((d) => {
        alexa.sendSequenceCommand(d.serialNumber, 'announcement', text, () => {
          done++;
          if (done === devices.length) ok(`Announced to ${devices.length} device(s): "${text}"`);
        });
      });
    } catch (e) {
      spinner.stop();
      err(e.message);
    }
  });

// ─── CMD ─────────────────────────────────────────────────────────────────────
program
  .command('cmd <text>')
  .description('Send any text command to Alexa')
  .option('-d, --device <name>', 'Target device')
  .action(async (text, opts) => {
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      alexa.sendSequenceCommand(device.serialNumber, 'textCommand', text, (e) => {
        if (e) return err(`Failed: ${e.message || e}`);
        ok(`Sent: "${text}" → ${chalk.bold(device.accountName)}`);
      });
    } catch (e) { err(e.message); }
  });

// ─── MUTE / UNMUTE ───────────────────────────────────────────────────────────
program
  .command('mute')
  .description('Mute device')
  .option('-d, --device <name>', 'Target device')
  .action(async (opts) => {
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      alexa.setVolume(device.serialNumber, 0, (e) => {
        if (e) return err(`Failed: ${e.message || e}`);
        ok(`Muted ${chalk.bold(device.accountName)}`);
      });
    } catch (e) { err(e.message); }
  });

// ─── ROUTINE ─────────────────────────────────────────────────────────────────
program
  .command('routine <name>')
  .description('Trigger an Alexa routine by name')
  .option('-d, --device <name>', 'Target device')
  .action(async (routineName, opts) => {
    const spinner = ora(`Triggering routine "${routineName}"...`).start();
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      spinner.stop();
      alexa.executeRoutine(routineName, device.serialNumber, (e) => {
        if (e) return err(`Failed: ${e.message || e}`);
        ok(`Routine "${routineName}" triggered on ${chalk.bold(device.accountName)}`);
      });
    } catch (e) {
      spinner.stop();
      err(e.message);
    }
  });

// ─── STATUS ──────────────────────────────────────────────────────────────────
program
  .command('status')
  .description('Show current playback status')
  .option('-d, --device <name>', 'Target device')
  .action(async (opts) => {
    const spinner = ora('Getting status...').start();
    try {
      const alexa = await connect();
      const device = await findDevice(alexa, opts.device);
      alexa.getPlayerInfo(device.serialNumber, (e, info) => {
        spinner.stop();
        if (e) return err(`Failed: ${e.message || e}`);
        if (!info) return dim('No playback info available.');

        const state = info.state?.status || 'UNKNOWN';
        const title = info.infoText?.title || '—';
        const subText = info.infoText?.subText1 || '';
        const vol = info.volume?.volume ?? '?';

        const stateColor = state === 'PLAYING' ? chalk.green : state === 'PAUSED' ? chalk.yellow : chalk.dim;
        console.log();
        console.log(`  Device  : ${chalk.bold(device.accountName)}`);
        console.log(`  Status  : ${stateColor(state)}`);
        console.log(`  Track   : ${chalk.bold(title)}`);
        if (subText) console.log(`  Artist  : ${subText}`);
        console.log(`  Volume  : ${vol}`);
        console.log();
      });
    } catch (e) {
      spinner.stop();
      err(e.message);
    }
  });

program.parse();
