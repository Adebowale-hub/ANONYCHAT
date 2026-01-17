// geminiService.js
const { GoogleGenerativeAI } = require("@google/generative-ai");
require("dotenv").config();

// Initialize Gemini API
let genAI = null;
let model = null;

// Check if API key is configured
if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY !== "your_gemini_api_key_here") {
    try {
        genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
        model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
        console.log("✅ Gemini AI initialized successfully");
    } catch (error) {
        console.error("❌ Failed to initialize Gemini AI:", error.message);
    }
} else {
    console.warn("⚠️  Gemini API key not configured. @gemini mentions will not work.");
    console.warn("   Get your free API key at: https://makersuite.google.com/app/apikey");
}

/**
 * Generate AI response using Gemini
 * @param {string} userMessage - The user's message
 * @param {string} username - Username of the person asking
 * @param {Array} recentMessages - Recent chat context (optional)
 * @returns {Promise<string>} - AI generated response
 */
async function generateGeminiResponse(userMessage, username = "User", recentMessages = []) {
    if (!model) {
        return "Sorry, I'm not configured yet! The admin needs to add a Gemini API key. Get one free at https://makersuite.google.com/app/apikey 🤖";
    }

    try {
        // Build context from recent messages
        let context = "";
        if (recentMessages.length > 0) {
            context = "Recent chat context:\n";
            recentMessages.forEach(msg => {
                if (!msg.isSystem) {
                    context += `${msg.senderUsername}: ${msg.text}\n`;
                }
            });
            context += "\n";
        }

        // Create the prompt
        const prompt = `You are Gemini, a helpful AI assistant in a chat room called "Brutal Chat". 
You are friendly, concise, and helpful. Keep responses brief (2-3 sentences max) unless asked for detail.
The user's name is ${username}.

${context}${username}: ${userMessage}

Gemini:`;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        return text.trim();
    } catch (error) {
        console.error("Gemini API Error:", error);

        // Handle specific errors
        if (error.message?.includes("API_KEY_INVALID")) {
            return "Oops! My API key is invalid. Please check the configuration. 🔑";
        } else if (error.message?.includes("quota")) {
            return "Sorry, I've reached my usage limit. Please try again later. ⏱️";
        } else {
            return "Sorry, I encountered an error processing your request. Please try again! 🤖";
        }
    }
}

/**
 * Check if Gemini is properly configured
 * @returns {boolean}
 */
function isGeminiAvailable() {
    return model !== null;
}

module.exports = {
    generateGeminiResponse,
    isGeminiAvailable
};
