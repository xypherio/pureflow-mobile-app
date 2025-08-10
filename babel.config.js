module.exports = function (api) {
  api.cache(true);
  return {
    presets: ["babel-preset-expo"],
    plugins: [
      [
        "module-resolver",
        {
          extensions: [".js", ".jsx", ".ts", ".tsx", ".json"],
          alias: {
            "@components": "./src/components",
            "@ui": "./src/components/ui",
            "@data-display": "./src/components/data-display",
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
      "react-native-reanimated/plugin",
    ],
  };
};
