# amc — Alexa Media Controller

Command-line tool for controlling Alexa devices. Built with `alexa-remote2`.

## Install

```bash
npm install
npm link   # makes `amc` available globally
```

## Setup

```bash
amc auth          # opens proxy on localhost:3456 — log in with Amazon
amc devices       # list your devices
amc default "Echo Dot"   # set your default device
```

## Commands

| Command | Description |
|---------|-------------|
| `amc auth` | Authenticate with Amazon |
| `amc devices` | List all Alexa devices |
| `amc default <name>` | Set default device |
| `amc play [query]` | Play music (Apple Music by default) |
| `amc pause` | Pause playback |
| `amc next` | Skip track |
| `amc prev` | Previous track |
| `amc vol <0-100>` | Set volume |
| `amc mute` | Mute |
| `amc say <text>` | Make Alexa say something (TTS) |
| `amc announce <text>` | Announce to all devices |
| `amc cmd <text>` | Send any text command |
| `amc routine <name>` | Trigger a named routine |
| `amc status` | Show current playback info |

## Options

Most commands accept `-d <device name>` to target a specific device:

```bash
amc play "Arctic Monkeys" -d "Living Room"
amc vol 40 -d "Kitchen Echo"
```

## Examples

```bash
amc play "Lofi hip hop"            # play on Apple Music (default)
amc play "The Beatles" -s spotify  # play on Spotify
amc say "Dinner is ready"
amc announce "Leaving in 5 minutes"
amc cmd "set a timer for 10 minutes"
amc vol 30
amc status
```

## Config

Stored at `~/.amc/config.json` (cookie + default device).
