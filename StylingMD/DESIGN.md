# Design System Strategy: The Electric Noir

## 1. Overview & Creative North Star
The Creative North Star for this design system is **"The Electric Noir."** 

This is not a standard dark mode; it is a cinematic interpretation of Tokyo’s late-night urban energy—where the weight of deep, charcoal shadows meets the piercing precision of neon light. To move beyond a "template" look, we reject the safety of centered, symmetrical grids. Instead, we embrace **Intentional Asymmetry** and **Editorial Scale**. 

Large, aggressive typography should bleed off-grid or overlap layered containers. We are building a "high-tech" interface that feels like a premium digital lens into a physical city. We achieve this by treating the screen not as a flat canvas, but as a series of stacked, translucent planes of glass and light.

---

## 2. Colors: Light Through the Void
The palette is rooted in the depth of `background: #121318`. Our accents aren't just colors; they are light sources.

### The "No-Line" Rule
Standard UI relies on 1px borders to separate content. **In this system, solid 1px structural borders are prohibited.** Sectioning must be achieved through:
- **Tonal Transitions:** Moving from `surface` to `surface-container-low` to define a new region.
- **Negative Space:** Using the spacing scale to create clear mental models of grouping.
- **Light Bleed:** Using a subtle `primary` glow to suggest a boundary without a hard stroke.

### Surface Hierarchy & Nesting
Treat the UI as a physical stack. The deeper the content, the darker the surface. 
- **The Base:** `surface-dim (#121318)`
- **The Content Layer:** `surface-container (#1e1f25)`
- **The Interaction Layer:** `surface-container-highest (#34343a)`

### The "Glass & Gradient" Rule
To capture the "Ginza" essence, floating elements (modals, dropdowns, navigation bars) must use **Glassmorphism**.
- **Recipe:** `surface-container` at 70% opacity + `backdrop-blur: 20px`.
- **Signature Texture:** For primary actions, use a linear gradient from `primary (#ffb1c4)` to `primary-container (#ff4a8d)`. This adds "soul" and prevents the neon from looking like a flat vector.

---

## 3. Typography: The Human & The Machine
We utilize a high-contrast typographic pairing to represent the duality of a modern metropolis: the human scale and the technical infrastructure.

*   **Display & Headlines (Plus Jakarta Sans):** These are your "billboards." Use `display-lg` and `headline-lg` with tight letter-spacing (-2%) to create an authoritative, editorial feel. Don't be afraid to let a headline dominate the top-left quadrant of a layout with significant white space below it.
*   **Body (Inter):** The workhorse. `body-md` provides maximum legibility against the dark background. Ensure you use the `on-surface-variant (#e5bcc5)` for secondary body text to reduce eye strain.
*   **Technical Labels (Space Grotesk):** This monospace font is reserved for "System Data"—dates, coordinates, IDs, and micro-copy. Use `label-md` or `label-sm`. It should feel like a readout on a high-tech HUD.

---

## 4. Elevation & Depth
We abandon traditional Material Design shadows in favor of **Tonal Layering** and **Ambient Glows**.

*   **The Layering Principle:** To lift a card, place a `surface-container-lowest (#0d0e13)` element inside a `surface-container-high (#292a2f)` section. This "recessed" look creates depth without artificial shadows.
*   **Ambient Shadows:** For floating components, use an extra-diffused shadow. 
    *   *Shadow Color:* A 10% opacity version of `primary (#ffb1c4)`.
    *   *Setting:* `0px 20px 40px`. It shouldn't look like a shadow; it should look like the component is emitting light onto the floor.
*   **The "Ghost Border" Fallback:** If accessibility requires a border, use `outline-variant (#5c3f46)` at 20% opacity. It must feel like a suggestion of an edge, not a cage.

---

## 5. Components

### Buttons: The Neon Pulse
- **Primary:** Gradient from `primary` to `primary-container`. Text is `on-primary-fixed (#3f001a)`. Apply a `0px 0px 12px` outer glow using the `primary` color.
- **Secondary (The Cyan Accent):** A "Ghost" style. No fill. Border is `secondary (#ffffff)` at 20% opacity. On hover, the border flashes to `secondary-fixed (#00fbfb)` with a matching glow.
- **Rounding:** Use `md (0.375rem)` for a sharp, architectural look. Avoid `full` rounding unless it's a floating action button.

### Cards & Lists
- **Rule:** Absolute prohibition of divider lines. 
- **Implementation:** Separate list items using a `4px` gap and a subtle background shift to `surface-container-low` on hover. Use `label-sm` (Space Grotesk) for metadata to create a "data-stream" aesthetic.

### Input Fields
- **Base State:** `surface-container-highest` background, no border.
- **Active State:** A 1px neon stroke using `secondary-fixed (#00fbfb)` and a `4px` inner blur of the same color. The label should shift to `primary`.

### Data HUD (Custom Component)
For technical details, create a "HUD Block": A `surface-container-lowest` box with a `sm` corner radius, featuring a `primary` 2px vertical "accent bar" on the left side. Populate this with `label-md` Space Grotesk text.

---

## 6. Do's and Don'ts

### Do:
- **Do** use intentional asymmetry. Align text to the left and images/data to the far right, leaving a "void" in the center.
- **Do** use `primary` sparingly. It is a "light source"—if everything glows, nothing is important.
- **Do** use the `secondary-fixed (#00fbfb)` (Cyan) specifically for "success" states or active technical indicators.

### Don't:
- **Don't** use pure black `#000000`. It kills the depth. Always use the `surface` tokens.
- **Don't** use 100% white for body text. Use `on-surface (#e3e1e9)` to maintain the cinematic, low-light vibe.
- **Don't** use standard "drop shadows." If an element needs to feel elevated, use tonal shifting or a colored glow.
- **Don't** use dividers. If you feel you need a line, use white space instead.