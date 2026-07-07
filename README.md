# Smadiums: FIFA World Cup 2026 Stadium Operations & Fan Experience Hub

**Smadiums** is a GenAI-enabled stadium operations and fan experience platform designed for the FIFA World Cup 2026. The solution leverages Generative AI to improve real-time spectator navigation, crowd compression safety, accessibility services, and resource sustainability across venue staff and global tournament fans.

---

## ⚽ Chosen Vertical

**Vertical**: *Stadium Operations, Accessibility & Fan Tournament Experience*  
The solution provides a dual-interface console addressing:
1. **Fan Experience Portal (Mobile-First)**: High-accessibility, multilingual AI wayfinding concierge, and live food/restroom queue optimization guides.
2. **Operations Control Center (Desktop Dashboard)**: 3D holographic crowd density telemetry grids, predictive flow alerts, automated AI incident response plans, and real-time sustainability optimization strategies.

---

## 🛠️ Approach & System Logic

Smadiums is built as a zero-dependency, ultra-lightweight **Single Page Application (SPA)** using **Semantic HTML5**, **Vanilla CSS**, and **Modular ES6 JavaScript**.

### 1. Unified State Architecture
All telemetry, zones, active incidents, chat records, and accessibility preferences are managed by a centralized, reactive state container (`src/state.js`). Whenever the state is updated, registered DOM updates are automatically triggered, ensuring synchronization between the telemetry grid, map, logs, and dialog interfaces.

### 2. Hybrid GenAI client
The AI layer (`src/ai-client.js`) features a hybrid connector:
* **Gemini API Integration**: Uses a user-provided API key (stored in local browser memory) to run live context-rich prompts.
* **Offline High-Fidelity Simulator**: Falls back to an advanced local rule-and-keyword parser that generates realistic responses matching World Cup scenarios (seating, transit delays, food wait times) immediately without network connectivity.

### 3. Visual 3D Hologram Projection
The dashboard features an SVG-based interactive map styled using CSS 3D perspectives (`perspective: 1000px`) and vector translations. The map floats and bobs gently to simulate a holographic projector, but provides a 2D Flat override for utility click actions.

---

## 🚀 How it Works

### 1. Operations View (Staff Mode)
* **Incident Alerting**: Stadium sensors automatically trigger alerts (e.g. scanner failures at Gate C).
* **GenAI Response Plans**: Pressing "Draft AI Response" prompts the GenAI engine to generate a complete response plan (dispatching volunteers, routing paths, and draft announcements in multiple languages).
* **Dynamic Resolution**: Clicking "Deploy Plan & Resolve" applies the routing adjustments and automatically returns the SVG map zones to a green "Optimal" state.
* **Eco-Advisory**: Analyzes live spectator telemetry to draft actions (e.g. HVAC load adjustments, halftime recycling sweeps) that help reach FIFA's green targets.

### 2. Fan Portal (Spectator Mode)
* **Multilingual Chatbot**: Direct text or voice dictation support. Automatically detects and replies in English, Spanish, or French.
* **A11y Helper**: Includes one-click toggles for high-contrast modes, dyslexia-friendly fonts, and a layout scaling slider.
* **Wayfinder**: Calculates and renders directions from gates to concessions while factoring in live queue metrics.

---

## 🎯 Hackathon Parameter Checklist

### 💻 Code Quality (Structure, Readability, Maintainability)
* **Modularity**: Code is divided into single-purpose ES6 modules:
  * `src/state.js` — Reactive data store.
  * `src/ui-render.js` — DOM manipulation & SVG listeners.
  * `src/sanitizer.js` — XSS sanitizer & markdown parser.
  * `src/ai-client.js` — AI connection layer.
  * `src/tests.js` — Unit tests definition.
* **Standards**: Pure ES6 modules using standard import/export semantics; zero build-step build dependencies.

### 🔒 Security (Safe Practices)
* **Prompt Injection Defense**: Intercepts safety bypass triggers (e.g. "ignore rules") using a local validation gateway (`detectPromptInjection`) before hitting the LLM.
* **XSS Sanitization**: Text and markdown parsing avoid raw HTML insertions; all inputs are escaped.
* **Secrets Protection**: API keys are saved in local storage inside the client browser, preventing accidental commits to git.
* **Traversal Protection**: Server-side script restricts path matching inside the workspace folder.

### ⚡ Efficiency (Time & Memory Optimization)
* **Layout Optimization**: Layout adjustments (text scaling) are debounced by 150ms to limit rendering reflows.
* **Memory Capping**: In-memory chat arrays are capped at 30 items, and operation logs are capped at 50 to prevent DOM bloat.
* **Resource Cost**: Zero npm dependencies at runtime. Served via native Node.js HTTP stream using less than 20MB of RAM.

### 🧪 Testing & Validation
* **Dual-Running Tests**: Running `npm test` executes the unit test assertions in Node CLI. The same test suite runs in the browser via the visual developer console.
* **Simulators**: Includes developer buttons to trigger and validate bottleneck resolutions immediately.

### ♿ Accessibility (Inclusive Design)
* **Keyboard Navigation**: All SVG elements (gates, seating tiers, concessions) are interactive tab-stops with glowing visual focus rings.
* **Themes**: Supports standard Dark Mode, Light Mode, and a high-contrast Black-and-White theme.
* **Inclusive Typo**: Dedicated font settings for Dyslexic readers and adjustable scale sliders.

---

## 📝 Assumptions Made

1. **Local Telemetry Simulation**: Restroom/concession queue times are simulated locally via random fluctuations in intervals to represent match halftime surges.
2. **Web Speech Synthesis**: Screen-reading and speech feedback assume support for the standard Web Speech API (supported by Chrome, Edge, and Safari).
3. **No Database Dependencies**: Data persistence is local-only (using browser memory and localStorage), making the application highly efficient and safe to run in isolated containers.

---

## 🏁 Getting Started

### Local Serve
Start the production server:
```bash
npm start
```
Open **[http://localhost:3000](http://localhost:3000)** in your browser.

### Test Runner
Run automated tests in the terminal:
```bash
npm test
```

### Docker Compilation
To package the app:
```bash
docker build -t smadiums-app .
```
*(Tests will automatically execute during the build phase; a test failure prevents compilation).*
