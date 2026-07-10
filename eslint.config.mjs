import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
  ]),
  {
    languageOptions: {
      parserOptions: {
        project: "./tsconfig.json",
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // P4.5: señal a futuro, no bloqueante — el patrón `fetchData()` sin
      // `void`/`.catch()` dentro de useEffect es común en todo el proyecto.
      // Empezar en "warn" y decidir caso por caso si vale la pena corregir.
      "@typescript-eslint/no-floating-promises": "warn",
    },
  },
]);

export default eslintConfig;
