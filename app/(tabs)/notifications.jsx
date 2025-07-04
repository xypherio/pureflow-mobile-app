import {
  AlertCircle,
  Check,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  Droplet,
} from "lucide-react-native";
import { useState } from "react";
import {
  Image,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { globalStyles } from "../globalStyles";

const LOGO_PATH = require("../../assets/images/pureflow-logo-1.png");

const iconMap = {
  danger: <AlertCircle color="#dc3545" size={22} />,
  warning: <Droplet color="#ffc107" size={22} />,
  info: <CheckCircle color="#28a745" size={22} />,
};

const allNotifications = [
  {
    id: 1,
    title: "Critical Contamination",
    message: "Water pH detected at dangerous levels.",
    time: "4:45 PM",
    type: "danger",
    parameter: "pH",
    date: "today",
    read: false,
  },
  {
    id: 2,
    title: "Moderate TDS Alert",
    message: "TDS approaching limit (530 ppm).",
    time: "2:10 PM",
    type: "warning",
    parameter: "Salinity",
    date: "today",
    read: false,
  },
  {
    id: 3,
    title: "Water Quality Normal",
    message: "All parameters within expected ranges.",
    time: "12:00 PM",
    type: "info",
    parameter: "Temperature",
    date: "today",
    read: true,
  },
  {
    id: 4,
    title: "pH Level Stabilized",
    message: "pH returned to 7.2.",
    time: "11:30 AM",
    type: "info",
    parameter: "pH",
    date: "yesterday",
    read: false,
  },
  {
    id: 5,
    title: "Filter Maintenance Logged",
    message: "Last maintenance recorded.",
    time: "10:15 AM",
    type: "info",
    parameter: "Turbidity",
    date: "yesterday",
    read: true,
  },
  {
    id: 6,
    title: "System Check Complete",
    message: "Diagnostics indicate normal function.",
    time: "9:00 AM",
    type: "info",
    parameter: "Temperature",
    date: "older",
    read: true,
  },
];

const sectionLabels = {
  today: "Today",
  yesterday: "Yesterday",
  older: "Previous Notifications",
};

export default function NotificationsScreen() {
  const insets = useSafeAreaInsets();
  const [showFilters, setShowFilters] = useState(false);
  const [filters, setFilters] = useState({
    status: [],
    alertLevel: [],
    parameter: [],
  });

  const filterGroups = [
    {
      label: "Status",
      key: "status",
      options: ["Read", "Unread"],
    },
    {
      label: "Alert Level",
      key: "alertLevel",
      options: ["Red", "Yellow", "Green"],
    },
    {
      label: "Water Parameter",
      key: "parameter",
      options: ["pH", "Temperature", "Turbidity", "Salinity"],
    },
  ];

  const toggleFilter = (group, value) => {
    setFilters((prev) => {
      const exists = prev[group].includes(value);
      return {
        ...prev,
        [group]: exists
          ? prev[group].filter((v) => v !== value)
          : [...prev[group], value],
      };
    });
  };

  const filtered = allNotifications.filter((n) => {
    if (filters.status.length) {
      if (filters.status.includes("Read") && !n.read) return false;
      if (filters.status.includes("Unread") && n.read) return false;
    }

    if (filters.alertLevel.length) {
      if (
        (filters.alertLevel.includes("Red") && n.type !== "danger") &&
        (filters.alertLevel.includes("Yellow") && n.type !== "warning") &&
        (filters.alertLevel.includes("Green") && n.type !== "info")
      )
        return false;
    }

    if (filters.parameter.length && !filters.parameter.includes(n.parameter)) {
      return false;
    }

    return true;
  });

  const grouped = {
    today: filtered.filter((n) => n.date === "today"),
    yesterday: filtered.filter((n) => n.date === "yesterday"),
    older: filtered.filter((n) => n.date === "older"),
  };

  const renderSection = (title, data) =>
    data.length > 0 && (
      <View className="mb-6">
        <Text className="text-gray-600 font-semibold text-sm mb-3">{title}</Text>
        {data.map((note) => (
          <View
            key={note.id}
            className="flex-row items-start bg-white rounded-2xl p-4 mb-3 shadow-sm"
          >
            <View className="w-10 h-10 rounded-full bg-[#f1f5f9] justify-center items-center mr-3">
              {iconMap[note.type]}
            </View>

            <View className="flex-1">
              <Text className="text-sm font-semibold text-gray-800">
                {note.title}
              </Text>
              <Text className="text-xs text-gray-600">{note.message}</Text>
              <Text className="text-xs text-gray-400 mt-1">{note.time}</Text>
            </View>

            {!note.read && (
              <View className="w-2 h-2 bg-blue-500 rounded-full mt-2 ml-2" />
            )}
          </View>
        ))}
      </View>
    );

  return (
    <SafeAreaView className="flex-1 bg-[#e6fbff]">
      <ScrollView
        contentContainerStyle={{
          paddingTop: insets.top + 8,
          paddingBottom: 110,
          paddingHorizontal: 16,
        }}
      >
        {/* Logo Header */}
        <View className="mb-4 items-start">
          <Image
            source={LOGO_PATH}
            style={globalStyles.logo}
            accessibilityLabel="app_logo"
          />
        </View>

        {/* Dropdown Filter */}
        <View className="mb-4">
          <TouchableOpacity
            onPress={() => setShowFilters(!showFilters)}
            className="flex-row justify-between items-center px-4 py-3 bg-white rounded-xl border border-gray-300"
          >
            <Text className="text-sm font-semibold text-gray-700">Filter</Text>
            {showFilters ? (
              <ChevronUp color="gray" size={18} />
            ) : (
              <ChevronDown color="gray" size={18} />
            )}
          </TouchableOpacity>

          {showFilters && (
            <View className="mt-3 bg-white p-4 rounded-xl border border-gray-200 shadow-sm">
              {filterGroups.map((group) => (
                <View key={group.key} className="mb-4">
                  <Text className="text-xs font-bold text-gray-500 mb-2">
                    {group.label}
                  </Text>
                  <View className="flex-row flex-wrap">
                    {group.options.map((opt) => {
                      const isActive = filters[group.key].includes(opt);
                      return (
                        <TouchableOpacity
                          key={opt}
                          onPress={() => toggleFilter(group.key, opt)}
                          className={`px-4 py-2 rounded-full border mr-2 mb-2 flex-row items-center ${
                            isActive
                              ? "border-blue-500 bg-blue-50"
                              : "border-gray-300 bg-white"
                          }`}
                        >
                          <Text
                            className={`text-sm ${
                              isActive ? "text-blue-600" : "text-gray-700"
                            }`}
                          >
                            {opt}
                          </Text>
                          {isActive && (
                            <Check
                              size={16}
                              color="#3b82f6"
                              className="ml-1"
                            />
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Sections */}
        {renderSection(sectionLabels.today, grouped.today)}
        {renderSection(sectionLabels.yesterday, grouped.yesterday)}
        {renderSection(sectionLabels.older, grouped.older)}

        {filtered.length === 0 && (
          <Text className="text-center text-gray-400 mt-12 text-sm">
            No notifications match your filter.
          </Text>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}
