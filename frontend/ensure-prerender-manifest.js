const fs = require("fs");
const path = require("path");

const manifestPath = path.join(__dirname, ".next", "prerender-manifest.json");

// Create prerender-manifest.json if it doesn't exist
if (!fs.existsSync(manifestPath)) {
  console.log("Creating prerender-manifest.json...");
  fs.writeFileSync(
    manifestPath,
    JSON.stringify({
      version: 4,
      routes: {},
      dynamicRoutes: {},
      notFoundRoutes: [],
      preview: {
        previewModeId: "development-preview-mode-id",
        previewModeSigningKey: "development-preview-mode-signing-key",
        previewModeEncryptionKey: "development-preview-mode-encryption-key"
      }
    }, null, 2)
  );
  console.log("✓ Created prerender-manifest.json");
} else {
  console.log("✓ prerender-manifest.json exists");
}
