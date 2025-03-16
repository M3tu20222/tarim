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
      ...nextPlugin.configs.recommended, //next için
      files: ["**/*.{js,jsx,ts,tsx}"], // Hangi dosyalara uygulanacağını belirt
      rules: {
        // Ek kurallar veya kural özelleştirmeleri buraya
        "@typescript-eslint/explicit-function-return-type": "off", // Gerekirse kapat
        "react/react-in-jsx-scope": "off", // Next.js'de gerekmeyebilir
        "react/prop-types": "off", // TypeScript kullanıyorsanız gerekmeyebilir
      },
      settings: {
          react: {
              version: "detect"
          }
      }
  }
];

export default eslintConfig;