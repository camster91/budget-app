import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = [
  {
    ignores: [
      ".next/**",
      "out/**",
      "build/**",
      "dist/**",
      "android/**",
      "ios/**",
      "next-env.d.ts",
    ],
  },
  ...nextVitals,
  ...nextTs,
];

export default eslintConfig;
