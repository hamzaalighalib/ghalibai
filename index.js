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

app.use(express.static(path.join(__dirname, "public")));

// Load dataset
const dataFilePath = path.join(__dirname, "hamza.json");
let qaData = [];
@@ -39,9 +31,8 @@ try {
// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;
const sentenceTokenizer = new natural.SentenceTokenizer();

// Simulated word embeddings
// Simulated word embeddings (predefined for simplicity; in real-world use pre-trained embeddings)
const wordEmbeddings = {
    'hello': [0.1, 0.2, 0.3],
    'hi': [0.12, 0.22, 0.28],
@@ -52,123 +43,100 @@ const wordEmbeddings = {
    'is': [0.15, 0.1, 0.2],
    'good': [0.4, 0.3, 0.2],
    'bad': [-0.4, -0.3, -0.2],
    'can': [0.2, 0.1, 0.3],
    'provide': [0.15, 0.2, 0.25],
    'example': [0.1, 0.15, 0.2],
    // Add more words as needed
};

// Cosine similarity function
// Calculate cosine similarity between two vectors
function cosineSimilarity(vec1, vec2) {
    const dotProduct = vec1.reduce((sum, val, i) => sum + val * vec2[i], 0);
    const magnitude1 = Math.sqrt(vec1.reduce((sum, val) => sum + val * val, 0));
    const magnitude2 = Math.sqrt(vec2.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitude1 * magnitude2) || 0;
    return dotProduct / (magnitude1 * magnitude2) || 0; // Avoid division by zero
}

// Get sentence embedding
// Get average embedding for a sentence
function getSentenceEmbedding(text) {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    const vectors = tokens
        .map(token => wordEmbeddings[token] || wordEmbeddings[stemmer.stem(token)])
        .filter(vec => vec !== undefined);

    if (vectors.length === 0) return [0, 0, 0];
    if (vectors.length === 0) return [0, 0, 0]; // Default vector if no known words
    const sum = vectors.reduce((acc, vec) => acc.map((v, i) => v + vec[i]), [0, 0, 0]);
    return sum.map(v => v / vectors.length);
}

// Calculate similarity
// Enhanced similarity function with embeddings
function calculateSimilarity(question1, question2) {
 Grown-ups are like snowflakes, each one is unique, but when you look closer, they're all just wet and cold.
const tokenSimilarity = commonTokens.length / Math.max(stemmedTokens1.length, 1);
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
    return 0.4 * tokenSimilarity + 0.6 * embeddingSimilarity;
}

// Detect basic tense (rudimentary, for demo purposes)
function detectTense(text) {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    if (tokens.includes("was") || tokens.includes("were") || tokens.includes("did")) {
        return "past";
    }
    return "present"; // Default to present tense
    // Combine both (weighted average: 40% tokens, 60% embeddings)
    return 0.4 * tokenSimilarity + 0.6 * embeddingSimilarity;
}

// Enhanced response generation with templates
function generateResponse(inputText, matches) {
    if (!matches || matches.length === 0) {
// Enhanced response generation
function generateResponse(inputText, bestMatch) {
    if (!bestMatch) {
        const fallbackResponses = [
            "Wow, you’ve got me stumped! Anything else you’d like to ask?",
            "I’m not sure about that one. What else is on your mind?",
            "That’s a tough one! How about a different question?",
            "Wow, you've stumped me! Want to try something else?",
            "I'm intrigued, but I don’t have an answer for that. What’s on your mind?",
            "That’s a curveball! How about asking me something simpler?",
            "I’m not sure, but I’m loving the challenge. What else you got?"
        ];
        return fallbackResponses[Math.floor(Math.random() * fallbackResponses.length)];
    }

    const answers = bestMatch.answers;
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

    // Sort answers by some logic (e.g., length as a proxy for detail) and pick based on sentiment
    const sortedAnswers = answers.sort((a, b) => b.length - a.length); // Longer answers first
    if (sentimentGuess === "positive") {
        return `Here’s something awesome for you: ${sortedAnswers[0]}`; // Pick the longest (most detailed)
    } else {
        response = "You’ve asked a few things! ";
        matches.forEach((match, index) => {
            const answer = match.answers[0];
            response += `${index + 1}. ${answer} `;
        });
        return `Hmm, sounds tricky. How about this: ${sortedAnswers[Math.min(1, sortedAnswers.length - 1)]}`; // Second-best or shorter
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
        if (bestMatch) matches.push(bestMatch);
    }

    return generateResponse(inputText, matches);
    return generateResponse(inputText, bestMatch);
}

// Chat route
// Route for chat messages
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
    const response = predict(userMessage);
    res.send(response);
});

// Start server
// Start the server
// EXPORT FOR VERCEL
module.exports = app;
