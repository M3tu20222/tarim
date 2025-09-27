// @ts-check
import { dirname } from "path";
import { fileURLToPath } from "url";
import { FlatCompat } from "@eslint/eslintrc";
import js from "@eslint/js";
import typescriptEslint from "typescript-eslint";
import nextPlugin from "@next/eslint-plugin-next";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const compat = new FlatCompat({
  baseDirectory: __dirname,
});

const eslintConfig = [
  js.configs.recommended, // ESLint'in önerilen kurallarını ekle
  ...typescriptEslint.configs.recommended, // TypeScript için önerilen kurallar
    ...compat.extends(
        "plugin:react/recommended", // React için önerilen kurallar
        "plugin:react-hooks/recommended",  // React Hooks için
        "plugin:jsx-a11y/recommended" //Erişilebilirlik
    ),
  {
      files: ["**/*.{js,jsx,ts,tsx}"], // Hangi dosyalara uygulanacağını belirt
      plugins: {
        "@next/next": nextPlugin
      },
      rules: {
        ...nextPlugin.configs.recommended.rules,
        // Ek kurallar veya kural özelleştirmeleri buraya
        "@typescript-eslint/explicit-function-return-type": "off",
        "@typescript-eslint/no-unused-vars": "warn", // Error yerine warning
        "@typescript-eslint/no-explicit-any": "warn", // Error yerine warning
        "react/react-in-jsx-scope": "off",
        "react/prop-types": "off",
        "react/no-unescaped-entities": "warn",
        "jsx-a11y/label-has-associated-control": "warn",
        "jsx-a11y/heading-has-content": "warn",
        "jsx-a11y/anchor-has-content": "warn",
        "react-hooks/exhaustive-deps": "warn",
        "prefer-const": "warn",
        "react/no-unknown-property": "warn",
        "@typescript-eslint/ban-ts-comment": "warn",
        "jsx-a11y/click-events-have-key-events": "warn",
        "jsx-a11y/no-static-element-interactions": "warn",
        "jsx-a11y/no-autofocus": "warn",
        "@next/next/no-html-link-for-pages": "warn",
      },
      settings: {
          react: {
              version: "detect"
          }
      }
  }
];

export default eslintConfig;