import StatusCard from "@components/datmStatusCard.jsx";
import GlobalWrapper from "@components/globalWrapper";
import PureFlowLogo from "@components/pureflowLogo";
import RealTimeData from "@components/realtimeData";
import SegmentedFilter from "@components/segmentedFilter";

import { useState } from "react";
import { Text, View } from "react-native";
import OverviewBox from "../components/realtimeChart";

export default function HomeScreen() {
  const [activeFilter, setActiveFilter] = useState("");

  return (
    <GlobalWrapper className="flex-1 bg-[#e6fbff] font-poppins">
      <View className="mb-4 items-start">
        <PureFlowLogo
          weather={{
            label: "Light Rain",
            temp: "30°C",
            icon: "partly",
          }}
        />
      </View>

      <StatusCard status="Active" battery="Low" />
      <RealTimeData />

      <OverviewBox>
        <SegmentedFilter
          activeFilter={activeFilter}
          setActiveFilter={setActiveFilter}
        />

        <Text className="text-center text-gray-400 font-poppins">
          Chart for {activeFilter}
        </Text>
      </OverviewBox>
    </GlobalWrapper>
  );
}

