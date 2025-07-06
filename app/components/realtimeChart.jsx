import { globalStyles } from "@styles/globalStyles";
import { Text, View } from "react-native";

export default function OverviewBox({ children }) {
  return (
    <View
      style={{
        backgroundColor: "#f6fafd",
        borderRadius: 16,
        padding: 16,
        height: 200,
        marginBottom: 28,
        justifyContent: "left",
        ...globalStyles.boxShadow,
      }}
    >
      {children || (
        <Text style={{ textAlign: "center", color: "#999" }}>
          Overview chart goes here...
        </Text>
      )}
    </View>
  );
}
