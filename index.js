const express = require("express");
const cors = require("cors");
const natural = require("natural");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const tokenizer = new natural.WordTokenizer();
const dataFilePath = path.join(__dirname, "hamza.json");

let generativeBrain = {};
let isTrained = false;

// --- HUMAN-LIKE TRAINING ---
function train() {
    if (isTrained) return;
    try {
        if (fs.existsSync(dataFilePath)) {
            const qaData = JSON.parse(fs.readFileSync(dataFilePath, "utf8")).data || [];
            generativeBrain = {}; 
            qaData.forEach(item => {
                const text = (item.question + " " + item.answers.join(" ")).toLowerCase();
                const tokens = tokenizer.tokenize(text);
                if (tokens) {
                    for (let i = 0; i < tokens.length - 1; i++) {
                        const curr = tokens[i];
                        const next = tokens[i + 1];
                        if (!generativeBrain[curr]) generativeBrain[curr] = [];
                        generativeBrain[curr].push(next);
                    }
                }
            });
            isTrained = true;
            console.log("🧠 Brain Ready");
        }
    } catch (e) { console.log("Training Error"); }
}

// --- API ROUTE (MUST BE FIRST) ---
app.get("/chat", (req, res) => {
    train(); 
    const msg = req.query.message || "";
    if (!msg) return res.json({ reply: "I am ready, Hamza!" });

    const tokens = tokenizer.tokenize(msg.toLowerCase());
    if (!tokens || tokens.length === 0) return res.json({ reply: "Tell me more!" });

    let current = tokens[tokens.length - 1];
    let result = [current];

    // Generative Loop (Markov Chain)
    for (let i = 0; i < 12; i++) {
        const choices = generativeBrain[current];
        if (!choices) break;
        const next = choices[Math.floor(Math.random() * choices.length)];
        result.push(next);
        current = next;
    }
    
    res.json({ reply: result.join(" ") });
});

// --- STATIC FRONTEND (SECOND) ---
app.use(express.static(path.join(__dirname, "public")));

// --- FALLBACK ---
app.get("*", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"));
});

module.exports = app;
