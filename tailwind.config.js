/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: {
        pureflow: {
          darkblue: "#224882",
          lightblue: "#356aaf",
          green: "#28a745",
          red: "#dc3545",
          yellow: "#ffc107",
          aqua: "#17a2b8",
        },
      },
    },
  },
  plugins: [],
}