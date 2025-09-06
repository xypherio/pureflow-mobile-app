import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = "AIzaSyA1J4Ue-GM0pJT2rcILsJD52tTyuRbmuO0";

const genAI = new GoogleGenerativeAI(API_KEY);

let lastGeminiCall = null; // Track the last time Gemini was called
const geminiCallInterval = 30 * 60 * 1000; // 30 minutes in milliseconds

let geminiQuota = 0;
const maxGeminiQuota = 5; // Set a maximum quota limit

export const generateInsight = async (sensorData) => {
    const now = Date.now();

    if (lastGeminiCall && now - lastGeminiCall < geminiCallInterval) {
        const timeSinceLastCall = now - lastGeminiCall;
        const timeLeft = geminiCallInterval - timeSinceLastCall;
        console.log(`Gemini API: Throttling. Time left: ${timeLeft / 1000} seconds`);

        return {
            overallInsight: `Gemini API was called recently. Please wait ${Math.ceil(timeLeft / (60 * 1000))} minutes.`,
            parameterRecommendations: []
        };
    }

    if (geminiQuota >= maxGeminiQuota) {
        console.warn("Gemini quota exceeded. Using fallback model.");
        return {
            overallInsight: "Gemini quota exceeded. Using fallback model.",
            parameterRecommendations: [
                {
                    "parameter": "pH",
                    "recommendation": "Fallback recommendation for pH.",
                    "status": "normal"
                },
                {
                    "parameter": "temperature",
                    "recommendation": "Fallback recommendation for temperature.",
                    "status": "normal"
                },
                {
                    "parameter": "salinity",
                    "recommendation": "Fallback recommendation for salinity.",
                    "status": "normal"
                },
                {
                    "parameter": "turbidity",
                    "recommendation": "Fallback recommendation for turbidity.",
                    "status": "normal"
                }
            ]
        };
    }

    try {
        const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

        const prompt = `
        Based on the following water quality sensor data, provide a detailed analysis and recommendations.
        The data is: ${JSON.stringify(sensorData)}

        Please return a JSON object with the following structure:
        {
          "insights": {
            "overallInsight": "A brief, 2-3 sentence summary of the water quality."
          },
          "suggestions": [
            {
              "parameter": "pH",
              "recommendation": "Detailed recommendation for pH.",
              "status": "normal|warning|critical"
            },
            {
              "parameter": "temperature",
              "recommendation": "Detailed recommendation for temperature.",
              "status": "normal|warning|critical"
            },
            {
              "parameter": "salinity",
              "recommendation": "Detailed recommendation for salinity.",
              "status": "normal|warning|critical"
            },
            {
              "parameter": "turbidity",
              "recommendation": "Detailed recommendation for turbidity.",
              "status": "normal|warning|critical"
            }
          ]
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // Clean the response to ensure it's valid JSON
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        try {
            geminiQuota++;
            lastGeminiCall = now; // Update the last call time
            return JSON.parse(cleanedText);
        } catch (jsonError) {
            console.error("Error parsing JSON from Gemini API:", jsonError);
            // Return a default error structure if parsing fails
            return {
                overallInsight: "Unable to generate insight at this time.",
                parameterRecommendations: []
            };
        }
    } catch (error) {
        console.error("Error generating insight:", error);
        return {
            overallInsight: "Unable to generate insight at this time.",
            parameterRecommendations: []
        };
    }
    finally {
        console.log("Gemini quota used:", geminiQuota);
    }
};

console.log("Gemini API initialized");
