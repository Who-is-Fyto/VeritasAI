# Interactive Claim-Corroboration SVG Graph

Hey! So instead of just displaying claims and sources in a boring list, we built an interactive relationship graph. It maps out how the claims in the article connect to external sources in real time. Here is the technical breakdown of how it's done!

---

## 1. Why SVG and Not Canvas?

Originally, I thought about using heavy libraries like D3.js or HTML5 Canvas, but they add a lot of bloat to the React bundle and can have weird rendering issues on mobile platforms. 
*   **The SVG Choice:** React renders SVG elements natively. We can use standard JSX tags like `<svg>`, `<circle>`, `<line>`, and `<text>` and control them using React states.
*   **Performance:** It's super lightweight, completely responsive, and scales beautifully to any screen size without looking blurry.

---

## 2. Setting Up Node Positions

The graph layout is structured into three clear columns across a `800x400` coordinate space:
1.  **Left Column (Claims):** Nodes representing the factual statements extracted from the article. The vertical position (Y-coordinate) is dynamically calculated and spaced depending on how many claims were found.
2.  **Center Node (Article):** The main anchor node representing the submitted text, centered at `(400, 200)`.
3.  **Right Column (Sources):** Nodes representing the news domains (like BBC or Reuters) matched in the search.

---

## 3. Interactive Highlights & State

To make the graph feel premium, we set up a hover track state:
*   `hoveredNode` (stores the ID of the node currently under the user's cursor).
*   When you hover over a **Claim**:
    *   The claim circle glows with an outer ring (using a CSS `animate-ping` circle).
    *   The connections linking that specific claim to the central article and the corresponding sources light up.
    *   All other unrelated nodes and links fade out (opacity drops to `0.35`).
*   When you hover over a **Source**:
    *   The matches are highlighted, showing exactly which claims it corroborates.

This makes the network model feel responsive and extremely professional!

---

*BSc IT Dissertation Notes — Michael Mazhambe*
