import GlobalWrapper from "@components/globalWrapper";
import NotificationCard from "@components/notificationCard";
import PureFlowLogo from "@components/pureflowLogo";
import { View } from "react-native";

export default function Alerts() {
  return (
    <GlobalWrapper className="flex-1 bg-[#e6fbff]">
      <View className="mb-4 items-start">
        <PureFlowLogo />
      </View>

      <NotificationCard
        type="status"
        title="High pH Level"
        message="Detected pH level of 9.1 in Pond B."
        parameter="ph"
        onClose={() => console.log("closed")}
      />

      <NotificationCard
        type="suggestion"
        title="Check Temperature Trend"
        message="Recent spikes detected in water temperature."
        parameter="temperature"
        primaryLabel="View Forecast"
        onPrimaryAction={() => navigation.navigate("Forecast")}
        onSecondaryAction={() => console.log("Later")}
        onClose={() => console.log("closed")}
      />
    </GlobalWrapper>
  );
}
