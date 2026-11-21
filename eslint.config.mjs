import { defineConfig } from "eslint/config";
import next from "eslint-config-next";

export default defineConfig([
  {
    ignores: [
      ".legacy_*/**",
      ".legacy_components/**",
      ".legacy_hooks/**",
      ".legacy_lib/**",
      ".next/**",
      "dist/**",
    ],
  },
  ...next,
]);
