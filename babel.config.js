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
            "@components": "./app/components",
            "@styles": "./app/styles",
            "@screens": "./app/(tabs)",
            "@assets": "./assets",
            "@utils": "./app/utils",
            "@hooks": "./backend/hooks",
            "@contexts": "./contexts",
            "@backend": "./backend",
            "@services": "./backend/services",
            "@firebaseConfig": "./backend/firebase",
            "@app": "./app",
            "@components": "./app/components",
          },
        },
      ],
      "react-native-reanimated/plugin",
    ],
  };
};
