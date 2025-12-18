import { GoogleGenerativeAI } from "@google/generative-ai";
import dotenv from "dotenv";
dotenv.config();

const apiKey = process.env.VITE_GEMINI_API_KEY;

if (!apiKey) {
    console.error("No API Key found in .env");
    process.exit(1);
}

const genAI = new GoogleGenerativeAI(apiKey);

async function listModels() {
    console.log(`Checking API Key ending in ...${apiKey.slice(-4)}`);
    try {
        // Note: listModels is not directly exposed in the minimal client 
        // for some versions, so we try to just ping a model we know 'should' exist
        // or use the generic fetch to the models endpoint if needed.
        // However, the best test is just to try to generate content with the common ones.

        const modelsToTest = ["gemini-1.5-flash", "gemini-pro", "gemini-1.0-pro", "gemini-2.0-flash-exp"];

        console.log("Testing specific models...");

        for (const modelName of modelsToTest) {
            process.stdout.write(`Testing ${modelName}: `);
            try {
                const model = genAI.getGenerativeModel({ model: modelName });
                const result = await model.generateContent("Hello");
                const response = await result.response;
                console.log("✅ SUCCESS");
            } catch (e) {
                if (e.message.includes("404")) {
                    console.log("❌ NOT FOUND (404)");
                } else {
                    console.log(`❌ ERROR: ${e.message.split('\n')[0]}`);
                }
            }
        }

    } catch (error) {
        console.error("Fatal Error:", error);
    }
}

listModels();
