import { globalStyles } from "@styles/globalStyles.js";
import { LinearGradient } from "expo-linear-gradient";
import { SafeAreaView, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function GlobalWrapper({ children, disableScrollView = false }) {
  const insets = useSafeAreaInsets();

  const content = (
    <View
      style={{
        paddingTop: insets.top + 0,
        paddingBottom: 100,
        paddingHorizontal: 16,
        flex: 1,
        zIndex: 9999,
      }}
    >
      {children}
    </View>
  );

  return (
    <SafeAreaView style={globalStyles.pageBackground}>
      {disableScrollView ? (
        content
      ) : (
        <ScrollView
          showsVerticalScrollIndicator={false}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={{
            paddingTop: insets.top + 60,
            paddingBottom: 100,
            paddingHorizontal: 16,
          }}
        >
          {children}
        </ScrollView>
      )}
      {/* Subtle bottom gradient overlay */}
      <View
        style={{
          position: "absolute",
          left: 0,
          right: 0,
          bottom: 0,
          height: 80,
          pointerEvents: "none",
        }}
      >
        <LinearGradient
          colors={["transparent", "#c2e3fb"]}
          style={{ flex: 1 }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}
