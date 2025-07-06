import SegmentedFilter from "@components/filterParameter";
import GlobalWrapper from "@components/globalWrapper";
import PureFlowLogo from "@components/pureflowLogo";
import RealTimeData from "@components/realtimeData";
import TopCard from "@components/topCard";

import { useState } from "react";
import { Text, View } from "react-native";
import OverviewBox from "../components/realtimeChart";

export default function HomeScreen() {
  const [activeFilter, setActiveFilter] = useState("");

  return (
    <GlobalWrapper className="flex-1 bg-[#e6fbff] font-poppins">
      <View className="mb-4 items-start">
        <PureFlowLogo />
      </View>

      <TopCard status="Active" battery="Low" />
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

