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
    shadowColor: "#1a2e51",
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 5, // Android shadow
  },
});

export default globalStyles;