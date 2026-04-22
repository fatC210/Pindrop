<div align="center">
  <img src="./public/pindrop-logo.svg" alt="PinDrop logo" width="112" />
  <h1>PinDrop</h1>
  <p><strong>Drop a pin on the map and listen to a place-specific soundscape.</strong></p>
  <p>
    <a href="./README.md">简体中文</a> ·
    <a href="./README.en.md">English</a>
  </p>
  <p>
    <img alt="Next.js 16" src="https://img.shields.io/badge/Next.js-16-black?style=flat-square" />
    <img alt="React 19" src="https://img.shields.io/badge/React-19-149ECA?style=flat-square" />
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-5-3178C6?style=flat-square" />
    <img alt="Leaflet" src="https://img.shields.io/badge/Leaflet-Map-199900?style=flat-square" />
    <img alt="ElevenLabs" src="https://img.shields.io/badge/Audio-ElevenLabs-5B44FF?style=flat-square" />
  </p>
</div>

## ✨ Overview

PinDrop is an interactive map experience for generating location-based soundscapes. Users can click anywhere on the world map, and the app combines geographic context, local time, region traits, and language cues to generate a matching ambient scene that can be played directly in the browser.

The project already forms a complete loop from map selection to soundscape generation, local caching, and playback, so it feels much closer to a working product prototype than a simple visual demo.

## 🌍 Highlights

- 🗺️ Map-first interaction: click any point on the map to start a place-specific sound experience.
- 🧠 More grounded scenes: the app enriches each location with LLM-generated narrative context before audio generation.
- 🎧 Multi-layer soundscape generation: ambient, signature, dialogue, secondary dialogue, and atmosphere layers work together.
- ⚡ Local cache reuse: generated places are stored in the browser to speed up replay and reduce repeated requests.
- 🌐 Bilingual interface: built-in Chinese and English UI support.
- 🔊 Instant playback controls: generated soundscapes can be played, paused, resumed, and revisited.
- 🧭 Fallback geographic inference: if reverse geocoding fails, the app can still infer region, terrain, timezone, and related context from coordinates.

## 🎼 Experience Flow

1. Pick a location on the map.
2. The app resolves or infers the place context, including time, terrain, region, and language signals.
3. It uses an LLM to make the scene more specific, then calls ElevenLabs to generate layered audio.
4. The result is cached locally for faster future playback.

## 🚀 Local Setup

### Run locally in development

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

Before generating soundscapes, complete the following in `Settings`:

- `ElevenLabs API Key`
- `LLM Base URL`
- `LLM Model`
- `LLM API Key`

### Run locally in production mode

```bash
npm run build
npm run start
```

### Quality checks

```bash
npm run lint
npm run type-check
npm run test
```

## 🧩 Tech Stack

- `Next.js 16`
- `React 19`
- `TypeScript`
- `Leaflet`
- `IndexedDB / localStorage`
- `ElevenLabs API`

## 📄 Open Source License

This project is released under the `MIT License`. See the root `LICENSE` file for the full text.

