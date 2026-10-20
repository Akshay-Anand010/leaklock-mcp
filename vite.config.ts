// Load Vite's config helper so this file is typed.
import { defineConfig } from "vite";

// Publish the dev-server settings for the explainer.
export default defineConfig({
  // Hold every setting that belongs to the local server.
  server: {
    // Listen on all interfaces so this VM can serve the page.
    host: "0.0.0.0",
    // Stay on the uncommon port chosen for this page.
    port: 43123,
    // Stop if 43123 is busy instead of hopping to another port.
    strictPort: true,
  }, // End the server settings.
}); // End the Vite config.
