# Rule schema

Rules are plain JSON objects validated by `validateRule()` in `src/rules.js`. They never contain code and are never executed as code. A future natural-language/LLM front end must produce exactly these objects; the app then shows the proposal, lets the participant edit it, validates it, and applies it only after confirmation. Requests that cannot be expressed with these types must be answered with an explanation, not an approximation presented as exact.

| `type` | Fields | Effect |
|---|---|---|
| `boost_item` | `bank`, `label`, `factor` | Multiplies one concept's likelihood (persistent, can be toggled) |
| `boost_tag` | `bank`, `tag`, `factor` | Multiplies every concept in `bank` carrying `tag` |
| `affinity` | `ifBank`, `ifLabel`, `thenBank`, `thenLabel`, `factor` | When the `if` concept is already chosen in this generation, multiplies the `then` concept |
| `set_params` | `changes` (`mode`, `memoryInfluence`, `reinforcement`, `exploration`, `novelty`, `repetition`) | Changes probability settings once |
| `novelty_loop` | `max` (1–5) | Wraps the last selection in a bounded "retry until the combination is new" loop |

- `bank` ∈ `needs | objects | actions`
- `factor` ∈ [0, 20]; 0 = never, 1 = no change
- Concept labels must exist in memory; setting values must lie inside the ranges of the sliders

## Procedure operations

`select`, `derive_property`, `conventional_function`, `transform`, `tension`, `if`, `repeat` (max 5 rounds), `compose`. See `src/process.js` (`OPS`, `validate`) — at most 16 steps, every slot defined before use, `compose` exactly once and last, no nested `if`/`repeat`.
