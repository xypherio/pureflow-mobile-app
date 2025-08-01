import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({
  pageBackground: {
    flex: 1,
    backgroundColor: "#e5f0f9",
  },

  logo: {
    width: 150,
    height: 65,
    resizeMode: "contain",
  },

  boxShadow: {
    shadowColor: "#2569d0",
    shadowOpacity: 0.05,
    shadowRadius: 20,
    shadowOffset: { width: 0, height: 0 },
    elevation: 5,
  },
});

export default globalStyles;