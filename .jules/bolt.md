## 2024-05-18 - Memoize isColorDark

**Learning:** `isColorDark` in `@excalidraw/common` uses `tinycolor2` to parse and calculate contrast for colors. This is called heavily during rendering of components like `ColorPicker` and `TopPicks`. Instantiating `tinycolor2` over and over for the exact same color string is a hidden overhead that can be simply memoized for an immediate performance boost in render loops. **Action:** Always look for color manipulation libraries or math libraries that are called inside loops/renders and check if they can be cached with a Map.
