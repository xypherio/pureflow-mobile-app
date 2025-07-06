import { Text } from "react-native";

export default function CustomText({ children, style, ...props }) {
  return (
    <Text
      style={[{ fontFamily: "Poppins_400Regular" }, style]}
      {...props}
    >
      {children}
    </Text>
  );
}
