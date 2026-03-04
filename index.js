const express = require("express");
const cors = require("cors");
const natural = require("natural");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// 1. SERVING THE FRONTEND (The 3D Space)
// This lets Vercel show your HTML/JS files inside the "public" folder
app.use(express.static(path.join(process.cwd(), "public")));

const dataFilePath = path.join(process.cwd(), "hamza.json");
const tokenizer = new natural.WordTokenizer();

// Global variables to store trained data in memory
let generativeBrain = {};
let isTrained = false;

// --- SMART BRAIN TRAINING ---
function trainGenerativeModel() {
    if (isTrained) return; // Don't retrain if already done

    try {
        if (fs.existsSync(dataFilePath)) {
            const fileData = fs.readFileSync(dataFilePath, "utf8");
            const qaData = JSON.parse(fileData).data || [];
            
            generativeBrain = {}; 
            qaData.forEach(item => {
                // Learn from both Questions and Answers to understand human speech
                const text = (item.question + " " + item.answers.join(" ")).toLowerCase();
                const tokens = tokenizer.tokenize(text);
                
                if (tokens) {
                    for (let i = 0; i < tokens.length - 1; i++) {
                        const curr = tokens[i];
                        const next = tokens[i + 1];
                        if (!generativeBrain[curr]) generativeBrain[curr] = [];
                        // Store every occurrence so common words have higher probability
                        generativeBrain[curr].push(next);
                    }
                }
            });
            isTrained = true;
            console.log("🧠 Brain fully trained with " + Object.keys(generativeBrain).length + " word patterns.");
        }
    } catch (error) {
        console.error("❌ Training Error:", error.message);
    }
}

// --- HUMAN-LIKE GENERATION ---
function generateHumanResponse(seedWord) {
    let current = seedWord.toLowerCase();
    let result = [current];
    let limit = 15; // Max sentence length

    for (let i = 0; i < limit; i++) {
        const possibilities = generativeBrain[current];
        if (!possibilities || possibilities.length === 0) break;

        // "HUMAN" LOGIC: Instead of picking the BEST word, we pick a RANDOM likely word
        // This makes the AI less like a robot and more like a person
        const randomIndex = Math.floor(Math.random() * possibilities.length);
        const nextWord = possibilities[randomIndex];

        result.push(nextWord);
        current = nextWord;

        // Stop if we hit a natural end (like a period or common ending word)
        if (["thanks", "bye", "end"].includes(current)) break;
    }
    
    // Clean up: Capitalize first letter
    let sentence = result.join(" ");
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// --- API ROUTES ---

// Route for your 3D Frontend to talk to the AI
app.get("/chat", (req, res) => {
    trainGenerativeModel(); // Ensures brain is ready

    const userMsg = req.query.message;
    if (!userMsg) return res.send({ reply: "I'm ready! Send me a message, Hamza." });

    const tokens = tokenizer.tokenize(userMsg.toLowerCase());
    if (!tokens || tokens.length === 0) {
        return res.send({ reply: "That's interesting! Can you tell me more?" });
    }

    // Use the last word to start the generation
    const lastWord = tokens[tokens.length - 1];
    let response = generateHumanResponse(lastWord);

    // If it's a one-word answer, it means the AI got stuck. Give it a push.
    if (response.split(" ").length === 1) {
        response = `Tell me more about ${response}. I want to learn!`;
    }

    res.json({
        reply: response,
        status: "Generative"
    });
});

// For Vercel, we must export the app
module.exports = app;

// Local testing
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => console.log(`🚀 AI Server: http://localhost:${PORT}`));
}
