import { globalStyles } from "@styles/globalStyles";
import * as Lucide from "lucide-react-native";
import { useEffect, useState } from "react";
import { Dimensions, Text, View } from "react-native";

const SCREEN_WIDTH = Dimensions.get('window').width;

const parameterIconMap = {
  ph: Lucide.Droplet,
  temperature: Lucide.Thermometer,
  tds: Lucide.Waves,
  salinity: Lucide.Water,
  // Add more as needed
};

const typeStyles = {
  success: {
    bg: '#d1fae5',
    icon: Lucide.CheckCircle2,
    iconColor: '#10b981',
    title: '#047857',
    message: '#047857',
  },
  warning: {
    bg: '#fef9c3',
    icon: Lucide.AlertCircle,
    iconColor: '#f59e42',
    title: '#b45309',
    message: '#b45309',
  },
  error: {
    bg: '#fee2e2',
    icon: Lucide.XCircle,
    iconColor: '#ef4444',
    title: '#b91c1c',
    message: '#b91c1c',
  },
};

export default function AlertsCard({ alerts = [], interval = 4000 }) {

  console.log("alerts", alerts);
  const [current, setCurrent] = useState(0);

  const hasAlertsWithParameter = Array.isArray(alerts) && alerts.some(a => a && a.parameter);

  const displayAlerts = hasAlertsWithParameter
    ? alerts.filter(a => a && a.parameter)
    : [
        {
          parameter: "",
          type: "success",
          title: "All Normal",
          message: "Water parameters in normal condition",
        },
      ];

  useEffect(() => {
    if (displayAlerts.length <= 1) return;
    const timer = setInterval(() => {
      setCurrent(prev => (prev + 1) % displayAlerts.length);
    }, interval);
    return () => clearInterval(timer);
  }, [displayAlerts, interval]);

  if (!displayAlerts.length) {
    return null;
  }

  const alert = displayAlerts[current];
  const style = typeStyles[alert.type] || typeStyles.error;
  const ParameterIcon =
    alert.parameter && parameterIconMap[alert.parameter]
      ? parameterIconMap[alert.parameter]
      : Lucide.HelpCircle;
  const LevelIcon = style.icon;

  return (
    <View
      style={{
        backgroundColor: style.bg,
        borderRadius: 16,
        padding: 16,
        flexDirection: 'row',
        alignItems: 'center',
        marginBottom: 8,
        ...globalStyles.boxShadow,
      }}
    >
      {/* Parameter icon */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "#fff",
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 8,
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <ParameterIcon size={22} color={style.title} />
      </View>
      {/* Level icon */}
      <View
        style={{
          width: 32,
          height: 32,
          borderRadius: 16,
          backgroundColor: "#fff",
          alignItems: 'center',
          justifyContent: 'center',
          marginRight: 12,
          borderWidth: 1,
          borderColor: "#e5e7eb",
        }}
      >
        <LevelIcon size={22} color={style.iconColor} />
      </View>
      {/* Texts */}
      <View style={{ flex: 1 }}>
        <Text style={{ fontWeight: 'bold', color: style.title, fontSize: 16, marginBottom: 2 }}>{alert.title}</Text>
        <Text style={{ color: style.message, fontSize: 14 }}>{alert.message}</Text>
      </View>
    </View>
  );
}
