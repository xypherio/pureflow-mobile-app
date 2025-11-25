import { TouchableOpacity, View, StyleSheet } from "react-native";
import { Play, Pause, SkipForward, SkipBack } from "lucide-react-native";

export default function AlertControls({
  isPlaying = true,
  totalAlerts = 0,
  currentIndex = 0,
  onTogglePlay,
  onNext,
  onPrevious,
  disabled = false,
}) {
  // Don't render controls if only one alert
  if (totalAlerts <= 1) return null;

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onPrevious}
        disabled={disabled}
      >
        <SkipBack size={16} color={disabled ? "#9ca3af" : "#374151"} />
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, styles.playButton, disabled && styles.buttonDisabled]}
        onPress={onTogglePlay}
        disabled={disabled}
      >
        {isPlaying ? (
          <Pause size={16} color={disabled ? "#9ca3af" : "#2563eb"} />
        ) : (
          <Play size={16} color={disabled ? "#9ca3af" : "#2563eb"} />
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={[styles.button, disabled && styles.buttonDisabled]}
        onPress={onNext}
        disabled={disabled}
      >
        <SkipForward size={16} color={disabled ? "#9ca3af" : "#374151"} />
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    paddingVertical: 8,
    paddingHorizontal: 16,
  },
  button: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#f3f4f6",
    marginHorizontal: 4,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  playButton: {
    backgroundColor: "#dbeafe",
  },
});
