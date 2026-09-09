import { defineConfig, globalIgnores } from "eslint/config";
import nextPlugin from "@next/eslint-plugin-next";
import hooks from "eslint-plugin-react-hooks";
import tseslint from "typescript-eslint";
export default defineConfig(
  { ...nextPlugin.configs["core-web-vitals"], files: ["**/*.{ts,tsx}"] },
  { ...hooks.configs.flat.recommended, files: ["**/*.{ts,tsx}"] },
  ...tseslint.configs.recommended,
  globalIgnores([
    ".next/**",
    "out/**",
    "node_modules/**",
    "next-env.d.ts",
    "playwright-report/**",
    "test-results/**",
  ]),
);
