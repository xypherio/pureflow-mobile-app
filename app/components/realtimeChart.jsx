import { globalStyles } from "@styles/globalStyles";
import { Text, View } from "react-native";

export default function OverviewBox({ children }) {
  return (
    <View
      style={{
        backgroundColor: "white",
        borderRadius: 16,
        padding: 16,
        height: 184, // ~11.5rem for chart
        marginHorizontal: 16,
        marginBottom: 28,
        justifyContent: "center",
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
