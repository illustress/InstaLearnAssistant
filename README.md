# InstaLearning

Learn German-Dutch vocabulary with quizzes, mini-games, and AI assistance — right inside your Instagram browsing experience.

## Features

- **4 Quiz Levels**: Multiple Choice, Type + Hints, Reverse, Speed Round
- **3 Mini Games**: Word Scramble, Hangman, Match Pairs
- **Credit System**: Earn credits by answering correctly, spend them to browse Instagram
- **AI Cards**: Gemini-powered mnemonics, smart sentences, and image prompts
- **Chat Assistant**: Built-in Gemini chat for vocabulary help
- **Progress Tracking**: Word levels, session stats, streak bonuses
- **CSV Import**: Bring your own word lists

## Setup

**Prerequisites:** Node.js

1. Install dependencies:
   `npm install`
2. Set your Gemini API key in [polyfill.js](polyfill.js)
3. Run the dev server:
   `npm run dev`

## Install as Extension

### Chrome / Edge / Brave

1. Go to `chrome://extensions` (or `edge://extensions`)
2. Enable **Developer mode**
3. Click **Load unpacked** and select this folder

### Firefox

1. Go to `about:debugging#/runtime/this-firefox`
2. Click **Load Temporary Add-on**
3. Select `manifest.json` from this folder
