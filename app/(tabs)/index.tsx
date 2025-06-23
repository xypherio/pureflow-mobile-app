import { Link } from "expo-router";
import React from "react";
import { Text, View } from "react-native";

export default function Index() {
  return (
    <View className="flex-1 justify-center items-center bg-white">
      <Text className="text-2xl text-blue-500">Welcome!</Text>

      <Link href="/notifications">Go to Notifications</Link>
    </View>
  );
}
