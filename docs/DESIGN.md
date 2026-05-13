# Amatu ERP Design Pillars

## 1. Visual Identity & Colors
The Amatu ERP brand is defined by a sophisticated yet energetic palette:

- **Primary Purple (#6F39BC):** The anchor of the brand. Represents luxury, quality, and authority. Used for primary buttons, sidebar, and key navigation elements.
- **Secondary Yellow (#FFCE00):** The energy. Used for accents, highlights, warnings, and to bring life to the interface.
- **Background White (#FFFFFF):** The canvas. Ensures extreme clarity and professional focus.

## 2. Typography
A unified font strategy for a modern and clean look:

- **Primary Font (Plus Jakarta Sans):** A modern, geometric font that balances character with extreme legibility. Used for all titles, body copy, and UI elements.

## 3. Visual Language & Shapes
- **Roundness:** A consistent base radius (0.5rem) is applied to cards and inputs to balance modern precision with approachability.
- **Shadows:** Use soft, ambient shadows instead of borders to define depth. Hierarchy is created through tonal layering.
- **Whitespace:** "Over-padding" is a feature. Every component should have room to breathe, avoiding the cramped feel of traditional ERPs.

## 4. Design Principles
- **Modern Heritage:** Blending high-end enterprise precision with the warmth of premium pet care.
- **Quiet Luxury:** Avoiding visual noise. If you think you need a divider, try using more whitespace first.
- **Data Vibrancy:** Let the numbers stand out through size contrast and the judicious use of the secondary yellow.

## 5. Implementation (Tailwind)
```css
--primary: #6F39BC;
--secondary: #FFCE00;
--background: #ffffff;
```
Always use semantic tokens (`bg-primary`, `text-primary-foreground`, etc.) to ensure consistency across the application.
