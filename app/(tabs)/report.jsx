import { Image, SafeAreaView, ScrollView, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalStyles } from "../globalStyles";

const LOGO_PATH = require('../../assets/images/pureflow-logo-1.png');

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

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
            style={globalStyles.logo}
            accessibilityLabel="app_logo"
          />
        </View>
      </ScrollView>

    </SafeAreaView>
  );
}
