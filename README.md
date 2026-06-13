<div align="center">

```
     ██╗ █████╗  ██████╗██╗  ██╗███████╗████████╗
     ██║██╔══██╗██╔════╝██║ ██╔╝██╔════╝╚══██╔══╝
     ██║███████║██║     █████╔╝ █████╗     ██║
██   ██║██╔══██║██║     ██╔═██╗ ██╔══╝     ██║
╚█████╔╝██║  ██║╚██████╗██║  ██╗███████╗   ██║
 ╚════╝ ╚═╝  ╚═╝ ╚═════╝╚═╝  ╚═╝╚══════╝   ╚═╝
```

**The spatial reasoning layer AI never had.**

`any AI · real space · no CAD`

[![MIT License](https://img.shields.io/badge/license-MIT-F5C400?style=flat-square)](LICENSE)
[![Node 20+](https://img.shields.io/badge/node-20%2B-F5C400?style=flat-square)](https://nodejs.org)
[![Stars](https://img.shields.io/github/stars/emmi-dev12/jacket?color=F5C400&style=flat-square)](https://github.com/emmi-dev12/jacket/stargazers)

</div>

---

> AI models are text-native. They think in tokens, not geometry.  
> Ask Claude to design a shelf bracket and you get code comments, not a part.  
> **Jacket is the layer that changes that.**

Wrap any AI — Claude, GPT-4o, Grok, DeepSeek — with Jacket and it gains a spatial world model it never had: geometry, constraints, printability, real-world physics. The model doesn't change. **The jacket does the rest.**

---

## The demo

```
$ jacket generate "wall-mounted phone holder, iPhone 16, charging hole at the bottom"

── Jacket is reading your request ──────────────────────────

JACKET › What material will you print in, and do you have a max height constraint?
YOU    › PETG, keep it under 80mm

── Jacket has what it needs ─────────────────────────────────
  Object   : iPhone 16 Wall Mount
  Spec     : Minimal wall-mounted holder with pass-through charging port
  Size     : 75 × 40 × 25mm
  Features : cable routing slot, mounting holes, friction grip
  Material : petg
──────────────────────────────────────────────────────────────

[compiling geometry...]

→ iphone-16-wall-mount.stl
```

**No CAD. No Blender. No 3D modeling experience. Just describe it.**

---

## How it works

```
Your words
    │
    ▼
[Interpreter]          ← asks only what it needs, confirms before acting
    │
    ▼
[AI of your choice]    ← Claude, GPT-4o, Grok, DeepSeek — unchanged
    │
    ▼
[Geometry Engine]      ← translates AI output → valid 3D geometry
    │
    ▼
[Constraints Validator] ← wall thickness, overhangs, printability
    │
    ▼
  .stl file            ← open in your slicer, print
```

Jacket is middleware. It doesn't replace your AI — it gives it a spatial world model, then gets out of the way.

---

## Quickstart

```bash
# Install
npm install -g jacket-ai

# Run the TUI
jacket

# Or open the visual Studio
jacket --webui
# → http://localhost:3141
```

First time, Jacket checks for OpenSCAD and asks permission to install it. It tells you what it's about to do, why, and links to verify. Then it waits for you to say yes.

**Jacket doesn't zip itself up. You have to zip it up.**

---

## Providers

| Provider | How to connect |
|---|---|
| **Claude** (Anthropic) | API key in Settings |
| **GPT-4o** (OpenAI) | API key in Settings |
| **Grok** (xAI) | One-click OAuth — uses your SuperGrok/X Premium+ subscription. No API key needed. |
| **DeepSeek** | API key in Settings |
| **Ollama** (local) | Coming soon — zero cost, fully offline |

Switch providers mid-session. Jacket doesn't care which model is under the jacket.

---

## Studio

```bash
jacket --webui
```

<div align="center">

```
┌─ JACKET ────────────────────────────────────────────────────────┐
│                                                                  │
│  [Claude] [GPT-4o] [Grok ◆] [DeepSeek]          ⚙ SETTINGS    │
│                                                                  │
│  ┌─ describe ──┐  ┌─── 3D PREVIEW ────────────┐  ┌─ editor ─┐  │
│  │             │  │                            │  │          │  │
│  │ your idea   │  │      ◇ rotating mesh       │  │ openscad │  │
│  │ here...     │  │                            │  │ code...  │  │
│  │             │  └────────────────────────────┘  │          │  │
│  └─────────────┘                                  └──────────┘  │
│  [ZIP UP JACKET →]         OBJECT — SIZE — MAT    [EXPORT STL]  │
│                                                                  │
│  JACKET › What material will you print in?                      │
│  YOU    › petg                                                   │
└──────────────────────────────────────────────────────────────────┘
```

</div>

- **3D preview** — interactive, drag to rotate
- **OpenSCAD editor** — edit the generated code directly, recompile live
- **Save + Learn** — Jacket notes your corrections and remembers them
- **History** — every object you've made, fully searchable

---

## Jacket learns

The longer you use Jacket, the smarter it gets about *you*.

After each session it quietly notes: your filament preference, your printer's bed size, your tolerance habits, your design taste. Next session, it already knows. You never explain your setup twice.

This is stored in `~/.jacket/memory.json` — yours, local, readable, deletable.

---

## The name

A jacket wraps around what's already there. It doesn't replace it. It adds capability, protection, structure — and when you take it off, the thing underneath is unchanged.

That's exactly what this is.

**The skin is your AI. The jacket is the spatial reasoning layer.**

And unlike a jacket — you have to zip it up yourself. Jacket never acts without your permission.

---

## Roadmap

- [x] CLI (`jacket generate "..."`)
- [x] TUI with history
- [x] Studio web UI with 3D preview
- [x] Multi-provider (Claude, GPT-4o, Grok, DeepSeek)
- [x] Grok OAuth — use SuperGrok subscription, no API key
- [x] Code editor with live recompile
- [x] Memory — Jacket learns your preferences over time
- [ ] Ollama adapter (fully local, no cost)
- [ ] STL repair for non-manifold geometry
- [ ] Slicer profiles (Bambu, Prusa, Voron)
- [ ] `jacket remix "make it bigger"` — iterate on existing STLs
- [ ] Site layout mode — spatial UI composition

---

## Contributing

The easiest contribution: **add a model adapter.**

```js
// src/adapters/your-model.js — it's ~20 lines
export async function chat({ model, system, messages }) { ... }
```

Open a PR. If it works, it ships.

---

## Philosophy

AI tools keep getting smarter. But they're all still text-native.

They can write about space. They can describe a shape. They can generate code that represents geometry. But they don't *think* spatially — they think linguistically about spatial things.

Jacket is the translation layer between those two worlds. Not a new model. Not a prompt template. A real middleware layer that gives language-native AI a spatial world model.

Nobody has built this properly. We're building it now.

---

<div align="center">

**MIT License** · Built in public · [Issues](https://github.com/emmi-dev12/jacket/issues) · [Discussions](https://github.com/emmi-dev12/jacket/discussions)

*Jacket doesn't zip itself up.*

</div>
