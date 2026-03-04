const express = require("express");
const cors = require("cors");
const natural = require("natural");
const fs = require("fs");
const path = require("path");

const app = express();
app.use(cors());
app.use(express.json());

const dataFilePath = path.join(__dirname, "hamza.json");
const tokenizer = new natural.WordTokenizer();

let generativeBrain = {};
let isTrained = false;

// --- INTELLIGENT TRAINING ---
function train() {
    if (isTrained) return;
    try {
        if (fs.existsSync(dataFilePath)) {
            const fileData = fs.readFileSync(dataFilePath, "utf8");
            const qaData = JSON.parse(fileData).data || [];
            
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
        }
    } catch (e) { console.error("Training issue: ", e.message); }
}

// --- GENERATION ENGINE ---
function generate(input) {
    const tokens = tokenizer.tokenize(input.toLowerCase());
    if (!tokens || tokens.length === 0) return "I am listening...";

    let current = tokens[tokens.length - 1];
    let result = [current];

    for (let i = 0; i < 12; i++) {
        const choices = generativeBrain[current];
        if (!choices) break;

        // Pick a choice based on what the AI learned
        const nextWord = choices[Math.floor(Math.random() * choices.length)];
        result.push(nextWord);
        current = nextWord;
        if (["thanks", "bye", "."].includes(current)) break;
    }
    
    let sentence = result.join(" ");
    return sentence.charAt(0).toUpperCase() + sentence.slice(1);
}

// --- ROUTES ---

// 1. API Route First
app.get("/chat", (req, res) => {
    train(); 
    const msg = req.query.message || "";
    if (!msg) return res.json({ reply: "Hello Hamza! I am ready." });
    
    res.json({ reply: generate(msg) });
});

// 2. Static Files Second
app.use(express.static(path.join(__dirname, "public")));

// 3. Root Fallback
app.get("/", (req, res) => {
    res.sendFile(path.join(__dirname, "public", "index.html"), (err) => {
        if (err) res.send("AI Online. Add your 3D files to the public folder!");
    });
});

module.exports = app;
