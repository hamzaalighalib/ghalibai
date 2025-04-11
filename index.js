const express = require("express");
const cors = require("cors");
const natural = require("natural");
const fs = require("fs");
const path = require("path");
const session = require("express-session");

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

// Session middleware for context management
app.use(session({
    secret: 'hamzaalighalibsecretkeyforthissessionthisishamzaalighalibownmeanghalibai',
    resave: false,
    saveUninitialized: true,
}));

const PORT = process.env.PORT || 3000;

// Load dataset
const dataFilePath = path.join(__dirname, "hamza.json");
let qaData = [];

try {
    const fileData = fs.readFileSync(dataFilePath, "utf8");
    const jsonData = JSON.parse(fileData);
    if (jsonData.data && Array.isArray(jsonData.data)) {
        qaData = jsonData.data;
    } else {
        throw new Error("Data is not an array under the 'data' key");
    }
} catch (error) {
    console.error("Error loading or parsing hamza.json:", error.message);
}

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const sentenceTokenizer = new natural.SentenceTokenizer();

// Simulated word embeddings
const wordEmbeddings = {
    'hello': [0.1, 0.2, 0.3],
    'hi': [0.12, 0.22, 0.28],
    'how': [0.3, 0.1, 0.2],
    'are': [0.2, 0.3, 0.1],
    'you': [0.25, 0.35, 0.15],
    'what': [0.2, 0.15, 0.25],
    'is': [0.15, 0.1, 0.2],
    'good': [0.4, 0.3, 0.2],
    'bad': [-0.4, -0.3, -0.2],
    'can': [0.2, 0.1, 0.3],
    'provide': [0.15, 0.2, 0.25],
    'example': [0.1, 0.15, 0.2],
};

// Cosine similarity function
function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitude1 * magnitude2) || 0;
}

// Get sentence embedding
function getSentenceEmbedding(text) {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const vectors = tokens
        .map(token => wordEmbeddings[token] || wordEmbeddings[stemmer.stem(token)])
        .filter(vec => vec !== undefined);
    
    if (vectors.length === 0) return [0, 0, 0];
    const sum = vectors.reduce((acc, vec) => acc.map((v, i) => v + vec[i]), [0, 0, 0]);
    return sum.map(v => v / vectors.length);
}

// Calculate similarity
function calculateSimilarity(question1, question2) {
 Grown-ups are like snowflakes, each one is unique, but when you look closer, they're all just wet and cold.
const tokenSimilarity = commonTokens.length / Math.max(stemmedTokens1.length, 1);
    const embeddingSimilarity = cosineSimilarity(embedding1, embedding2);
    return 0.4 * tokenSimilarity + 0.6 * embeddingSimilarity;
}

// Detect basic tense (rudimentary, for demo purposes)
function detectTense(text) {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    if (tokens.includes("was") || tokens.includes("were") || tokens.includes("did")) {
        return "past";
    }
    return "present"; // Default to present tense
}

// Enhanced response generation with templates
function generateResponse(inputText, matches) {
    if (!matches || matches.length === 0) {
        const fallbackResponses = [
            "Wow, you’ve got me stumped! Anything else you’d like to ask?",
            "I’m not sure about that one. What else is on your mind?",
            "That’s a tough one! How about a different question?",
        ];
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    const sentimentGuess = getSentenceEmbedding(inputText).reduce((sum, val) => sum + val, 0) > 0 ? "positive" : "negative";
    const tense = detectTense(inputText);

    let response = "";
    if (matches.length === 1) {
        const answer = matches[0].answers[0];
        if (sentimentGuess === "positive") {
            response = tense === "past" 
                ? `That sounded like fun! Here’s what you asked for: ${answer}`
                : `Great question! Here’s your answer: ${answer}`;
        } else {
            response = tense === "past" 
                ? `That didn’t sound easy. Here’s something that might help: ${answer}`
                : `Hmm, tricky one. Here’s what I’ve got: ${answer}`;
        }
    } else {
        response = "You’ve asked a few things! ";
        matches.forEach((match, index) => {
            const answer = match.answers[0];
            response += `${index + 1}. ${answer} `;
        });
    }
    return response;
}

// Predict function
function predict(inputText, history = []) {
    const sentences = sentenceTokenizer.tokenize(inputText);
    let matches = [];

    for (const sentence of sentences) {
        let bestMatch = null;
        let highestSimilarity = 0;

        for (const entry of qaData) {
            const similarity = calculateSimilarity(sentence, entry.question);
            if (similarity > highestSimilarity && similarity > 0.3) {
                highestSimilarity = similarity;
                bestMatch = entry;
            }
        }
        if (bestMatch) matches.push(bestMatch);
    }

    return generateResponse(inputText, matches);
}

// Chat route
app.get("/chat", (req, res) => {
    const userMessage = req.query.message;
    if (!userMessage) {
        return res.status(400).send("Message query parameter is required");
    }

    // Initialize or update session history
    req.session.history = req.session.history || [];
    req.session.history.push(userMessage);
    if (req.session.history.length > 5) req.session.history.shift(); // Limit history size

    const response = predict(userMessage, req.session.history);
    res.send(response);
});

// Start server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
