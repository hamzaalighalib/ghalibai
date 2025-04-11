const express = require("express");
const cors = require("cors");
const natural = require("natural");
const fs = require("fs");
const path = require("path");

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

app.use(express.static(path.join(__dirname, "public")));

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

// Simulated word embeddings (predefined for simplicity; in real-world use pre-trained embeddings)
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
    // Add more words as needed
};

// Calculate cosine similarity between two vectors
function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitude1 * magnitude2) || 0; // Avoid division by zero
}

// Get average embedding for a sentence
function getSentenceEmbedding(text) {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const vectors = tokens
        .map(token => wordEmbeddings[token] || wordEmbeddings[stemmer.stem(token)])
        .filter(vec => vec !== undefined);
    
    if (vectors.length === 0) return [0, 0, 0]; // Default vector if no known words
    const sum = vectors.reduce((acc, vec) => acc.map((v, i) => v + vec[i]), [0, 0, 0]);
    return sum.map(v => v / vectors.length);
}

// Enhanced similarity function with embeddings
function calculateSimilarity(question1, question2) {
    // Token-based similarity (original)
    const tokens1 = tokenizer.tokenize(question1.toLowerCase());
    const tokens2 = tokenizer.tokenize(question2.toLowerCase());
    const stemmedTokens1 = tokens1.map(token => stemmer.stem(token));
    const stemmedTokens2 = tokens2.map(token => stemmer.stem(token));
    const commonTokens = stemmedTokens1.filter(token => stemmedTokens2.includes(token));
    const tokenSimilarity = commonTokens.length / Math.max(stemmedTokens1.length, 1);

    // Embedding-based similarity
    const embedding1 = getSentenceEmbedding(question1);
    const embedding2 = getSentenceEmbedding(question2);
    const embeddingSimilarity = cosineSimilarity(embedding1, embedding2);

    // Combine both (weighted average: 40% tokens, 60% embeddings)
    return 0.4 * tokenSimilarity + 0.6 * embeddingSimilarity;
}

// Enhanced response generation
function generateResponse(inputText, bestMatch) {
    if (!bestMatch) {
        const fallbackResponses = [
            "Wow, you've stumped me! Want to try something else?",
            "I'm intrigued, but I don’t have an answer for that. What’s on your mind?",
            "That’s a curveball! How about asking me something simpler?",
            "I’m not sure, but I’m loving the challenge. What else you got?"
        ];
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    const answers = bestMatch.answers;
    const sentimentGuess = getSentenceEmbedding(inputText).reduce((sum, val) => sum + val, 0) > 0 ? "positive" : "negative";

    // Sort answers by some logic (e.g., length as a proxy for detail) and pick based on sentiment
    const sortedAnswers = answers.sort((a, b) => b.length - a.length); // Longer answers first
    if (sentimentGuess === "positive") {
        return `Here’s something awesome for you: ${sortedAnswers[0]}`; // Pick the longest (most detailed)
    } else {
        return `Hmm, sounds tricky. How about this: ${sortedAnswers[Math.min(1, sortedAnswers.length - 1)]}`; // Second-best or shorter
    }
}

// Predict based on input
function predict(inputText) {
    let bestMatch = null;
    let highestSimilarity = 0;

    for (const entry of qaData) {
        const similarity = calculateSimilarity(inputText, entry.question);
        if (similarity > highestSimilarity && similarity > 0.3) { // Threshold for relevance
            highestSimilarity = similarity;
            bestMatch = entry;
        }
    }

    return generateResponse(inputText, bestMatch);
}

// Route for chat messages
app.get("/chat", (req, res) => {
    const userMessage = req.query.message;
    if (!userMessage) {
        return res.status(400).send("Message query parameter is required");
    }

    const response = predict(userMessage);
    res.send(response);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
