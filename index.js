const express = require("express");
const cors = require("cors");
const natural = require("natural");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// 1. Data Loading
const dataFilePath = path.join(__dirname, "hamza.json");
let qaData = [];
let generativeBrain = {}; // This stores word probabilities

try {
    const fileData = fs.readFileSync(dataFilePath, "utf8");
    const jsonData = JSON.parse(fileData);
    qaData = jsonData.data || [];
    console.log("✅ hamza.json loaded.");
} catch (error) {
    console.error("❌ Error loading hamza.json:", error.message);
}

// 2. NLP Tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Simulated word embeddings for 3D Vector Math
const wordEmbeddings = {
    'hello': [0.1, 0.2, 0.3],
    'hi': [0.12, 0.22, 0.28],
    'how': [0.3, 0.1, 0.2],
    'are': [0.2, 0.3, 0.1],
    'you': [0.25, 0.35, 0.15],
    'code': [0.5, -0.1, 0.4],
    'javascript': [0.55, -0.15, 0.45],
    'weather': [-0.2, 0.5, 0.1]
};

// --- GENERATIVE TRAINING LOGIC ---
// This builds a "Next-Word" map from your JSON
function trainGenerativeModel() {
    qaData.forEach(item => {
        // We train on both questions and answers
        const fullText = (item.question + " " + item.answers.join(" ")).toLowerCase();
        const tokens = tokenizer.tokenize(fullText);

        for (let i = 0; i < tokens.length - 1; i++) {
            const current = tokens[i];
            const next = tokens[i + 1];

            if (!generativeBrain[current]) generativeBrain[current] = {};
            // Count how many times 'next' follows 'current'
            generativeBrain[current][next] = (generativeBrain[current][next] || 0) + 1;
        }
    });
    console.log("🧠 Brain Trained: Generative patterns stored.");
}

// --- 3D VECTOR MATH ---
function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const mag1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const mag2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (mag1 * mag2) || 0;
}

function findSimilarWord(word) {
    let bestWord = null;
    let maxSim = -1;
    const vec1 = wordEmbeddings[word];
    if (!vec1) return null;

    for (let target in wordEmbeddings) {
        if (target === word) continue;
        const sim = cosineSimilarity(vec1, wordEmbeddings[target]);
        if (sim > maxSim) {
            maxSim = sim;
            bestWord = target;
        }
    }
    return maxSim > 0.8 ? bestWord : null;
}

// --- GENERATION ENGINE ---
function generateResponse(seedWord) {
    let current = seedWord.toLowerCase();
    let result = [current];
    let limit = 15; // Max words in response

    for (let i = 0; i < limit; i++) {
        const possibilities = generativeBrain[current];
        if (!possibilities) {
            // Try to find a similar word if we get stuck
            const similar = findSimilarWord(current);
            if (similar && generativeBrain[similar]) {
                current = similar;
                continue;
            } else break;
        }

        // Pick the most likely next word (The "Winner")
        const next = Object.keys(possibilities).reduce((a, b) => 
            possibilities[a] > possibilities[b] ? a : b
        );
        
        result.push(next);
        current = next;
        if (current.includes(".") || result.length > limit) break;
    }
    return result.join(" ");
}

// --- API ROUTES ---
app.get("/chat", (req, res) => {
    const userMsg = req.query.message;
    if (!userMsg) return res.status(400).send("No message provided");

    const tokens = tokenizer.tokenize(userMsg.toLowerCase());
    const lastWord = tokens[tokens.length - 1];

    // Generate a brand new answer based on the user's last word
    let response = generateResponse(lastWord);

    // Fallback if the AI doesn't know the word at all
    if (response === lastWord) {
        response = "I'm learning about '" + lastWord + "'. Can you tell me more?";
    }

    res.send({
        reply: response,
        intelligenceType: "Generative Markov Chain",
        seed: lastWord
    });
});

// Start and Train
trainGenerativeModel();
app.listen(PORT, () => {
    console.log(`🚀 Mini-ChatGPT Running on http://localhost:${PORT}`);
});
