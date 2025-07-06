import { globalStyles } from "@styles/globalStyles";
import { SafeAreaView, ScrollView } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GlobalWrapper({ children }) {
  const insets = useSafeAreaInsets();

  return (
    <SafeAreaView style={globalStyles.pageBackground}>
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 110,
          paddingHorizontal: 16,
          paddingBottom: 100
        }}
      >
          {children}
      </ScrollView>
    </SafeAreaView>
  );
}
