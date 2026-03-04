const express = require("express");
const cors = require("cors");
const natural = require("natural");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// 1. DATA PATHS (Vercel uses __dirname to find files in your folder)
const dataFilePath = path.join(__dirname, "hamza.json");
const tokenizer = new natural.WordTokenizer();

let generativeBrain = {};
let isTrained = false;

// 2. THE BRAIN TRAINER (With Error Protection)
function trainBrain() {
    if (isTrained) return; 
    try {
        if (!fs.existsSync(dataFilePath)) {
            console.log("⚠️ hamza.json not found, using empty brain.");
            return;
        }

        const rawData = fs.readFileSync(dataFilePath, "utf8");
        const jsonData = JSON.parse(rawData);
        const qaData = jsonData.data || [];

        generativeBrain = {}; 
        qaData.forEach(item => {
            // Combine Question + Answers into one long sentence for learning
            const fullText = (item.question + " " + item.answers.join(" ")).toLowerCase();
            const tokens = tokenizer.tokenize(fullText);
            
            if (tokens && tokens.length > 1) {
                for (let i = 0; i < tokens.length - 1; i++) {
                    const current = tokens[i];
                    const next = tokens[i + 1];
                    if (!generativeBrain[current]) generativeBrain[current] = [];
                    generativeBrain[current].push(next);
                }
            }
        });

        isTrained = true;
        console.log("✅ Brain Trained Successfully!");
    } catch (err) {
        console.error("❌ Training Failed:", err.message);
    }
}

// 3. THE GENERATOR (Human-Like Randomness)
function generateResponse(input) {
    const tokens = tokenizer.tokenize(input.toLowerCase());
    if (!tokens || tokens.length === 0) return "I am listening...";

    let current = tokens[tokens.length - 1]; // Start with the last word user typed
    let result = [current];
    let maxLength = 12;

    for (let i = 0; i < maxLength; i++) {
        const nextWords = generativeBrain[current];
        if (!nextWords || nextWords.length === 0) break;

        // Pick a RANDOM word from the list to make it feel human
        const randomIndex = Math.floor(Math.random() * nextWords.length);
        const chosenWord = nextWords[randomIndex];

        result.push(chosenWord);
        current = chosenWord;

        if (result.length > maxLength) break;
    }

    // Capitalize and return
    let finalOutput = result.join(" ");
    return finalOutput.charAt(0).toUpperCase() + finalOutput.slice(1);
}

// 4. THE ROUTES (Order is very important!)

// A. The Chat API
app.get("/chat", (req, res) => {
    trainBrain(); // Ensure brain is loaded
    const userMessage = req.query.message || "";
    
    if (userMessage.length < 1) {
        return res.json({ reply: "Ask me something, Hamza!" });
    }

    const aiReply = generateResponse(userMessage);
    res.json({ reply: aiReply });
});

// B. Static Files (Your 3D World)
// This serves index.html from your 'public' folder
app.use(express.static(path.join(__dirname, "public")));

// C. Root Route Fallback
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"), (err) => {
        if (err) res.status(200).send("AI Server is Online. Upload your HTML to 'public' folder!");
    });
});

// 5. EXPORT FOR VERCEL
module.exports = app;

// Local Development Support
if (process.env.NODE_ENV !== 'production') {
    app.listen(3000, () => console.log("🚀 Running at http://localhost:3000"));
}
