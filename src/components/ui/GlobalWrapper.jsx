import { globalStyles } from "@styles/globalStyles.js";
import { LinearGradient } from "expo-linear-gradient";
import { forwardRef } from 'react';
import { SafeAreaView, ScrollView, StyleSheet, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

const GlobalWrapper = forwardRef(({ children, disableScrollView = false, style }, ref) => {
  const insets = useSafeAreaInsets();

  const content = (
    <View style={[styles.content, { paddingTop: insets.top }]}>
      {children}
    </View>
  );

  return (
    <SafeAreaView style={[globalStyles.pageBackground, style]}>
      {disableScrollView ? (
        <View ref={ref} style={styles.scrollContainer}>
          {content}
        </View>
      ) : (
        <View ref={ref} style={styles.scrollContainer}>
          <ScrollView
            showsVerticalScrollIndicator={false}
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={[styles.scrollContent, { paddingTop: insets.top + 60 }]}
          >
            {children}
          </ScrollView>
        </View>
      )}
      {/* Subtle bottom gradient overlay */}
      <View style={styles.gradientOverlay}>
        <LinearGradient
          colors={["rgba(255, 255, 255, 0.1)", "rgba(255, 255, 255, 0.8)"]}
          style={styles.gradient}
          start={{ x: 0, y: 0 }}
          end={{ x: 0, y: 1 }}
        />
      </View>
    </SafeAreaView>
  );
});

export default GlobalWrapper;

const styles = StyleSheet.create({
  content: {
    paddingBottom: 100,
    paddingHorizontal: 16,
    flex: 1,
    zIndex: 9999,
  },
  scrollContainer: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 100,
    paddingHorizontal: 16,
  },
  gradientOverlay: {
    position: "absolute",
    left: 0,
    right: 0,
    bottom: 0,
    height: 80,
    pointerEvents: "none",
  },
  gradient: {
    flex: 1,
  },
});
