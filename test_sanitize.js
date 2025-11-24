const { sanitizeTextForPDF } = require('./src/utils/exportUtils');

// Test cases demonstrating the fix for Unicode characters that cause WinAnsi errors
const testCases = [
  {
    name: "Narrow no-break space (original error)",
    input: "Temperature is 25°C",
    expected: "Temperature is 25°C"
  },
  {
    name: "Smart quotes",
    input: "This is a "quoted" string",
    expected: "This is a \"quoted\" string"
  },
  {
    name: "En and em dashes",
    input: "Range: 5–10°C or 10—20°C",
    expected: "Range: 5-10°C or 10-20°C"
  },
  {
    name: "Fractions",
    input: "½ glass of water",
    expected: "1/2 glass of water"
  },
  {
    name: "Superscripts",
    input: "10² meters",
    expected: "10^2 meters"
  },
  {
    name: "Euro symbol",
    input: "Cost: €100",
    expected: "Cost: EUR100"
  },
  {
    name: "Accented characters",
    input: "Naïve café",
    expected: "Naive cafe"
  },
  {
    name: "Mixed Unicode",
    input: "pH 7.2±0.1 °C – excelente",
    expected: "pH 7.2+-0.1 degC - excelente"
  }
];

// Run tests
console.log("Testing sanitizeTextForPDF function:\n");

let passed = 0;
let total = testCases.length;

testCases.forEach((testCase, index) => {
  const result = sanitizeTextForPDF(testCase.input);
  const success = result === testCase.expected;

  console.log(`Test ${index + 1}: ${testCase.name}`);
  console.log(`Input: "${testCase.input}"`);
  console.log(`Expected: "${testCase.expected}"`);
  console.log(`Actual: "${result}"`);
  console.log(`Status: ${success ? 'PASS ✅' : 'FAIL ❌'}\n`);

  if (success) passed++;
});

console.log(`\nSummary: ${passed}/${total} tests passed`);

if (passed === total) {
  console.log("🎉 All tests passed! The sanitizeTextForPDF function successfully handles Unicode characters.");
} else {
  console.log("❌ Some tests failed. Check the function implementation.");
}

// Additional demonstration
console.log("\n=== Demonstration of Unicode-to-ASCII mapping ===");
console.log("This function converts problematic Unicode characters to safe ASCII equivalents:");
console.log("- Narrow no-break space (U+202F) → space");
console.log("- Smart quotes → regular quotes/double quotes");
console.log("- Dashes → hyphens");
console.log("- Fractions → fraction strings (½ → 1/2)");
console.log("- Superscripts/subscripts → caret notation (^2, _0)");
console.log("- Currency symbols → text abbreviations (EUR100)");
console.log("- Accented letters → base letters (café → cafe)");
console.log("- And many more...");
