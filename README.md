# Live Language Translator AI Agent 🗣️⚡

A real-time, voice-to-voice translation agent built with **React**, **Google Gemini AI**, and the **Web Speech API**. It listens to your voice, translates it contextually using a Large Language Model (LLM), and speaks the result back to you.

## 🐳 Docker Support

You can run the Translator Agent in a containerized environment using Docker.

### 1. Configure Environment
Ensure you have a `.env` file in the root directory with your API key:
```env
VITE_GEMINI_API_KEY=your_gemini_api_key_here
```

### 2. Build and Run
Use Docker Compose to build and start the application:
```bash
docker-compose up --build
```

The application will be available at [http://localhost:8080](http://localhost:8080).

### Why Docker?
- **Consistent Environment**: Runs the same way on any machine.
- **Security**: Your API key is managed via environment variables and never entered in the UI.
- **Isolation**: No need to install Node.js locally after the initial setup.

## 🚀 Quick Start

1.  **Install Dependencies**
    ```bash
    npm install
    ```

2.  **Run Development Server**
    ```bash
    npm run dev
    ```

3.  **Setup API Key**
    *   Click the **Gear Icon ⚙️** (top right) in the app.
    *   Enter your **Google Gemini API Key**.
    *   (Optional) Create a `.env` file: `VITE_GEMINI_API_KEY=your_key_here`.

## 🏗️ Code Explanation

### 1. `src/hooks/useSpeech.js`
A custom React Hook that abstracts the browser's native capabilities.
*   **Speech Recognition**: Uses `window.SpeechRecognition` to convert your voice into text in real-time (`transcript`).
*   **Speech Synthesis**: Uses `window.speechSynthesis` and `SpeechSynthesisUtterance` to make the browser "speak" the translated text (`speak` function).

### 2. `src/components/Translator.jsx`
The main "Brain" and UI of the application.
*   **State Management**: Tracks `apiKey`, `modelName`, `transcript`, and `translation`.
*   **AI Integration**:
    *   Uses `@google/generative-ai` SDK.
    *   Sends a prompt to Gemini: *"Act as a professional translator. Translate [text] from [Language A] to [Language B]"*.
    *   **Auto-Retry**: If the API returns a `429 Too Many Requests` (common on free tiers), the code automatically catches it, waits ~6 seconds, and retries.
*   **UI/UX**:
    *   **Lucide React**: For icons (Mic, Sparkles, Settings).
    *   **Tailwind CSS**: For the glassmorphism look (translucent backdrops) and pulsing animations when the agent is "thinking" or "listening".

### 3. Rate Limit Handling
The app uses the **Experimental Gemini 2.0 Flash** model by default for speed, but this model has strict rate limits on the free tier.
*   **Solution**: The app implements an exponential backoff strategy. If it hits a limit, it informs you, waits, and tries again without you needing to refresh.

## 🛠️ Tech Stack
*   **Frontend**: React (Vite)
*   **Styling**: Tailwind CSS
*   **AI Model**: Gemini 2.0 Flash / 1.5 Flash / 1.5 Pro
*   **APIs**: Google Generative AI SDK, Web Speech API
