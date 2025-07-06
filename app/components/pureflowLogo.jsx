// app/components/PureFlowLogo.jsx

import { globalStyles } from "@styles/globalStyles"; // adjust if path changes
import { Image } from "react-native";

const LOGO_PATH = require("../../assets/logo/pureflow-logo.png"); // adjust if path changes

export default function PureFlowLogo({ style, ...props }) {
  return (
    <Image
      source={LOGO_PATH}
      style={[globalStyles.logo, style, { marginHorizontal: 15 }]}
      accessibilityLabel="pureflow_logo"
      {...props}
    />
  );
}
