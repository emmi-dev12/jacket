# JACKET

**The spatial reasoning layer AI never had.**

> Any AI. Real space. No CAD.

---

<!-- DEMO GIF GOES HERE — record: type a description → watch STL appear → rotating 3D preview -->

---

## What is it?

AI models are text-native. They think in tokens, not geometry. Ask any of them to design a 3D object and you get code comments, not a printable file.

Jacket is the layer that changes that.

Wrap any AI with Jacket and it gains a spatial world model: it understands geometry, real-world constraints, printability, wall thickness, gravity. The model doesn't change. The jacket does the rest.

```bash
npx jacket generate "wall-mounted phone holder, charging hole at bottom, fits iPhone 16"
# → holder.stl  (print-ready, no supports needed)
```

## Why

Everyone has a 3D printer now. Almost nobody can design for one.  
The gap isn't hardware. It's the translation layer between human intent and physical geometry.  
Jacket is that layer.

## How it works

```
Your words → [Jacket Core] → AI model of your choice → [Geometry Engine] → STL / GLTF
                  ↑                                            ↑
         spatial context injected                  constraints validated
         (world model, material, limits)           (printable? structurally sound?)
```

1. **Prompt preprocessor** — injects a spatial world model into every AI call so the model reasons geometrically, not verbally
2. **Geometry engine** — translates structured AI output into real 3D geometry
3. **Constraints validator** — checks printability, overhangs, wall thickness, gravity
4. **Model adapters** — works with Claude, OpenAI, Ollama, and anything else

## Quickstart

```bash
npm install -g jacket-ai

# Set your model (Claude, OpenAI, or local via Ollama)
jacket config --model claude

# Generate something
jacket generate "a small pot for a succulent, drainage hole, 10cm diameter"
# → pot.stl
```

## Adapters

| Model | Status |
|-------|--------|
| Claude (Anthropic) | ✅ built-in |
| OpenAI GPT-4o | ✅ built-in |
| Ollama (local) | ✅ built-in |
| Grok | 🔜 coming |
| Your model | 👋 open a PR |

**Want to add an adapter?** See [CONTRIBUTING.md](./CONTRIBUTING.md) — it's ~50 lines.

## Roadmap

- [x] Core spatial middleware
- [x] STL output
- [ ] GLTF / web preview
- [ ] Constraints library (materials, printer profiles)
- [ ] Visual editor (drag to adjust, re-generate)
- [ ] Site layout mode (2D → spatial UI composition)

## Philosophy

The jacket metaphor is intentional.  
The AI is the skin. Jacket is what you put over it.  
The skin doesn't change. The capabilities do.

## License

MIT — use it, fork it, build on it.

---

*Built with the belief that physical creation shouldn't require technical skill — just intent.*
