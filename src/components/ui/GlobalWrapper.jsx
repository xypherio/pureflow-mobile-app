import { globalStyles } from "@styles/globalStyles.js";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef } from 'react';
import { SafeAreaView, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GlobalWrapper = forwardRef(({ children, disableScrollView = false, style }, ref) => {
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
    <SafeAreaView style={[globalStyles.pageBackground, style]}>
      {disableScrollView ? (
        <View ref={ref} style={{ flex: 1 }}>
          {content}
        </View>
      ) : (
        <View ref={ref} style={{ flex: 1 }}>
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
        </View>
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
          colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.8)"]}
          style={{ flex: 1 }}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>
    </SafeAreaView>
  );
});

export default GlobalWrapper;
