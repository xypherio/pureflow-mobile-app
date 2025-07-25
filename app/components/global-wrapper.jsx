import { globalStyles } from "@styles/globalStyles";
import { LinearGradient } from 'expo-linear-gradient';
import { SafeAreaView, ScrollView, View } from "react-native";
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
      {/* Subtle bottom gradient overlay */}
      <View style={{ position: 'absolute', left: 0, right: 0, bottom: 0, height: 80, pointerEvents: 'none' }}>
        <LinearGradient
          colors={["transparent", "#98d2f8"]}
          style={{ flex: 1 }}
          start={{ x: 0.5, y: 0 }}
          end={{ x: 0.5, y: 1 }}
        />
      </View>
    </SafeAreaView>
  );
}
