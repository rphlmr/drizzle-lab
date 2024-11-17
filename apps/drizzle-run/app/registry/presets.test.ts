import { test } from "vitest";

import { type Dialect, getCoreFiles, getPresetFiles, getPresetsManifest } from ".";

test("Registry presets are valid", async () => {
  const presetsManifest = getPresetsManifest();
  const dialects = Object.keys(presetsManifest) as Dialect[];
  const promises = [];

  for (const dialect of dialects) {
    promises.push(getCoreFiles(dialect));

    for (const preset of presetsManifest[dialect]) {
      promises.push(getPresetFiles(dialect, preset.id));
    }
  }

  await Promise.all(promises);
});
