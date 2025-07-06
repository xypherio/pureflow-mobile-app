import GlobalWrapper from "@components/globalWrapper";
import PureFlowLogo from "@components/pureflowLogo";
import { View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function HomeScreen() {
  const insets = useSafeAreaInsets();

  return (
    <GlobalWrapper className="flex-1 bg-[#e6fbff]">
        {/* Header */}
        <View className="mb-4 items-start">
          <PureFlowLogo />
        </View>
    </GlobalWrapper>
  );
}
