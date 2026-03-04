const express = require("express");
const cors = require("cors");
const natural = require("natural");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

// 1. Data Loading - Using absolute path for Vercel compatibility
const dataFilePath = path.join(process.cwd(), "hamza.json");
let qaData = [];
let generativeBrain = {};

try {
    if (fs.existsSync(dataFilePath)) {
        const fileData = fs.readFileSync(dataFilePath, "utf8");
        const jsonData = JSON.parse(fileData);
        qaData = jsonData.data || [];
        console.log("✅ hamza.json loaded.");
    }
} catch (error) {
    console.error("❌ JSON Error:", error.message);
}

// 2. NLP Tools
const tokenizer = new natural.WordTokenizer();

// Simulated word embeddings
const wordEmbeddings = {
    'hello': [0.1, 0.2, 0.3],
    'hi': [0.12, 0.22, 0.28],
    'how': [0.3, 0.1, 0.2],
    'are': [0.2, 0.3, 0.1],
    'you': [0.25, 0.35, 0.15]
};

// --- GENERATIVE TRAINING ---
function trainGenerativeModel() {
    generativeBrain = {}; // Reset brain before training
    qaData.forEach(item => {
        const fullText = (item.question + " " + item.answers.join(" ")).toLowerCase();
        const tokens = tokenizer.tokenize(fullText);
        if (!tokens) return;

        for (let i = 0; i < tokens.length - 1; i++) {
            const current = tokens[i];
            const next = tokens[i + 1];
            if (!generativeBrain[current]) generativeBrain[current] = {};
            generativeBrain[current][next] = (generativeBrain[current][next] || 0) + 1;
        }
    });
}

// --- GENERATION ENGINE ---
function generateResponse(seedWord) {
    if (!seedWord) return "I am listening! What's on your mind?";
    
    let current = seedWord.toLowerCase();
    let result = [current];
    let limit = 12; 

    for (let i = 0; i < limit; i++) {
        const possibilities = generativeBrain[current];
        if (!possibilities) break;

        // Find the most likely next word
        const next = Object.keys(possibilities).reduce((a, b) => 
            possibilities[a] > possibilities[b] ? a : b
        );
        
        result.push(next);
        current = next;
        if (result.length > limit) break;
    }
    return result.join(" ");
}

// --- API ROUTES ---
app.get("/", (req, res) => {
    res.send("AI Server is Online, Hamza!");
});

app.get("/chat", (req, res) => {
    // Train on every request or once - for Serverless, we ensure it's trained
    trainGenerativeModel();

    const userMsg = req.query.message;
    if (!userMsg) return res.status(400).send({ error: "No message provided" });

    const tokens = tokenizer.tokenize(userMsg.toLowerCase());
    
    // Safety check if no tokens are found
    if (!tokens || tokens.length === 0) {
        return res.send({ reply: "I didn't quite catch that. Can you say it differently?" });
    }

    const lastWord = tokens[tokens.length - 1];
    let response = generateResponse(lastWord);

    // If the brain couldn't find a path, give a friendly fallback
    if (response === lastWord) {
        response = "That's interesting! Tell me more about '" + lastWord + "'.";
    }

    res.send({
        reply: response,
        seed: lastWord
    });
});

// IMPORTANT FOR VERCEL: Export the app
module.exports = app;

// Only listen if running locally
if (process.env.NODE_ENV !== 'production') {
    const PORT = 3000;
    app.listen(PORT, () => console.log(`🚀 Local Server: http://localhost:${PORT}`));
}
