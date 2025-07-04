import { StyleSheet } from "react-native";

export const globalStyles = StyleSheet.create({
  body: {
    flex: 1,
    backgroundColor: "#c7d8f0",
  },
  logo: {
    width: 130,
    height: 50,
    resizeMode: "contain",
  },
  boxShadow: {
    shadowColor: "midnightblue",
    shadowOpacity: 0.2,
    shadowRadius: 12,
  }
});

export default globalStyles