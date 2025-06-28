import { collection, getDocs } from "firebase/firestore";
import React, { useEffect } from "react";
import { Image, SafeAreaView, ScrollView, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { db } from "../../firebase";


const LOGO_PATH = require('../../assets/images/pureflow-logo-1.png');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  useEffect(() => {
    const testFirebase = async () => {
      try {
        const querySnapshot = await getDocs(collection(db, "test"));
        querySnapshot.forEach((doc) => {
          console.log("Document:", doc.id, "=>", doc.data());
        });
      } catch (err) {
        console.error("Firebase connection error:", err);
      }
    };

    testFirebase();
  }, []);

  return (
    <SafeAreaView className="flex-1 bg-[#e6fbff]">
      <ScrollView  contentContainerStyle={{
          padding: 16,
          paddingBottom: 110,
          paddingTop: insets.top + 8
        }}>
        {/* Header */}
        <View className="mb-.1 items-start">
          <Image
            source={LOGO_PATH}
            style={{ width: 200, height: 80, resizeMode: 'contain' }}
            accessibilityLabel="app_logo"
          />
        </View>

        {/* Top Card Placeholder */}
        <View className="h-16 bg-white rounded-xl mb-4 shadow-sm" />

        {/* Real-Time Data */}
        <Text className="text-xs text-[#6c757d] mb-2">Real-Time Data</Text>
        <View className="flex-row flex-wrap justify-between gap-4 mb-6">
          {[...Array(4)].map((_, i) => (
            <View
              key={i}
              className="w-[48%] h-32 bg-white rounded-xl shadow-sm"
            />
          ))}
        </View>

        {/* Daily Trends */}
        <Text className="text-xs text-[#6c757d] mb-2">Daily Trends</Text>
        <View className="h-60 bg-white rounded-xl shadow-sm" />
      </ScrollView>

    </SafeAreaView>
  );
}
