/** @type {import('tailwindcss').Config} */
module.exports = {
  // NOTE: Update this to include the paths to all of your component files.
  content: ["./app/**/*.{js,jsx,ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        poppins: ["Poppins_400Regular", "Poppins_500Medium", "Poppins_700Bold"],
      },
      colors: {
        pureflow: {
          darkblue: "#224882",
          lightblue: "#356aaf",
        },
        'picton-blue': {
          50: '#f2f8fd',
          100: '#e5f0f9',
          200: '#c5e0f2',
          300: '#91c7e8',
          400: '#51a7d8',
          500: '#3190c6',
          600: '#2273a7',
          700: '#1c5c88',
          800: '#1b4e71',
          900: '#1c425e',
        },
      },
    },
  },
  plugins: [],
}