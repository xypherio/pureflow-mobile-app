module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module:react-native-dotenv",
        {
          moduleName: "@env",
          path: ".env",
          safe: false,
          allowUndefined: true,
        },
      ],
      [
        "module-resolver",
        {
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
          alias: {
            "@components": "./src/components",
            "@ui": "./src/components/ui",
            "@dataDisplay": "./src/components/data-display",
            "@navigation": "./src/components/navigation",
            "@forms": "./src/components/forms",
            "@screens": "./app/(tabs)",
            "@services": "./src/services",
            "@hooks": "./src/hooks",
            "@contexts": "./src/contexts",
            "@utils": "./src/utils",
            "@constants": "./src/constants",
            "@types": "./src/types",
            "@assets": "./src/assets",
            "@styles": "./src/styles",
            "@app": "./app",
          },
        },
      ],
      "react-native-worklets/plugin",
    ],
  };
};
