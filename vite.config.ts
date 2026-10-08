import { readdir } from "node:fs/promises";
import { resolve } from "node:path";
import { defineConfig, type Plugin } from "vite";

function gifIndex(): Plugin {
  return {
    name: "scrollless-gif-index",
    apply: "build",
    async generateBundle() {
      const entries = await readdir(resolve("public/gif"), { withFileTypes: true });
      const gifs = entries
        .filter((entry) => entry.isFile() && /\.gif$/i.test(entry.name))
        .map((entry) => entry.name)
        .sort();
      this.emitFile({ type: "asset", fileName: "gif/index.json", source: JSON.stringify(gifs) });
    },
  };
}

export default defineConfig(({ command, mode }) => {
  if (command === "serve" || mode === "popup" || mode === "production") {
    return {
      base: "./",
      plugins: [gifIndex()],
      build: { outDir: "dist", emptyOutDir: true },
    };
  }

  if (mode === "background") {
    return {
      publicDir: false,
      build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
          entry: resolve("src/background.ts"),
          formats: ["es"],
          fileName: () => "background.js",
        },
      },
    };
  }

  if (mode === "content") {
    return {
      publicDir: false,
      build: {
        outDir: "dist",
        emptyOutDir: false,
        lib: {
          entry: resolve("src/content.ts"),
          name: "ScrollLessContent",
          formats: ["iife"],
          fileName: () => "content.js",
        },
      },
    };
  }

  throw new Error(`Unknown Vite build mode: ${mode}`);
});
