# Jacket — Plan

## Context
The user wants to build a viral GitHub project. Through brainstorming we landed on a genuinely uncharted idea: a **spatial reasoning layer ("the jacket") that wraps any AI model and gives it the ability to think and output in 3D space**. The AI model itself doesn't change — the jacket intercepts inputs/outputs, adds spatial world-model reasoning, real-world constraints (gravity, material limits, printability), and produces geometry. First killer demo: text → 3D-printable STL file, no CAD skills required.

## What We're Building

**Jacket** — a model-agnostic spatial intelligence middleware layer.

- Any AI (Claude, GPT, Grok, local models) can be wrapped with Jacket
- Input: natural language intent ("a wall-mounted phone holder with a charging hole, fits iPhone 16")
- Output: 3D geometry (STL/GLTF), spatial layouts, visual compositions
- The model does NOT need vision capabilities — Jacket IS the spatial world model
- Real-world constraints engine built in: printability, wall thickness, gravity, material

## Why It's Uncharted
- Existing tools (Meshy, Shap-E, OpenSCAD+AI) are either closed, require 3D skills, or just generate meshes without constraint reasoning
- Nobody has built the **translation layer** between language-native AI and space-native output
- The "jacket" concept — infrastructure any skin can wear — has no equivalent

## Branding

**Name:** Jacket (also a yellowjacket — the insect)
**Mascot:** Stylized geometric yellowjacket wasp — angular, black + yellow, works at favicon size
**Wordmark:** JACKET in geometric sans (Neue Haas Grotesk or Geist). No gradients, no glow. Sharp.
**Voice:** Confident, minimal, slightly sharp. "Any AI. Real space. No CAD."
**Color:** Black + yellow (#F5C400 or similar). Zero gradients.

## The Viral Demo (README anchor)
Single GIF in the README:
1. User types: *"wall-mounted phone holder, charging hole bottom, fits iPhone 16"*
2. Jacket feeds spatial context to Claude (unmodified)
3. Output: rotating 3D preview + download STL button
4. Caption: *"No CAD. No Blender. Just describe it."*

## Technical Approach (high level)
1. **Jacket Core (OSS)** — the spatial middleware layer
   - Prompt preprocessor: injects spatial world model context into any LLM call
   - Geometry engine: translates AI structured output → actual 3D geometry (Three.js / OpenSCAD programmatic)
   - Constraints validator: checks printability, wall thickness, overhangs
   - Output: STL, GLTF, or visual layout JSON
2. **Model adapters** — thin wrappers for Claude, OpenAI, Ollama (local)
3. **Demo app** — minimal web UI: text input → 3D preview → export
4. **CLI** — `jacket generate "describe your object"` → outputs STL

## Repository Structure
```
jacket/
  core/          # spatial middleware
  adapters/      # claude, openai, ollama
  constraints/   # real-world rules engine
  demo/          # web app (the viral demo)
  cli/           # jacket CLI
  README.md      # the GIF + one-liner is everything
```

## GitHub Launch Strategy
- README leads with the GIF — no text above it
- One-liner headline: "The spatial reasoning layer AI never had."
- Show HN post: frame it as infrastructure, not an app
- First issue: "Add your model adapter" — invites community contribution immediately
- License: MIT (maximizes stars and forks)

## Verification / Next Steps
1. Spike the geometry engine: can we take structured LLM output and produce a valid STL?
2. Build the constraints validator for printability (the hardest part)
3. Record the demo GIF with a real iPhone holder example
4. Write the README before writing any other code
