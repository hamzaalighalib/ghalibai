const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const natural = require("natural");

// Create Express application
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));
app.use(express.json());

// Load data from JSON file
const dataFilePath = path.join(__dirname, "hamza.json");
const data = JSON.parse(fs.readFileSync(dataFilePath, "utf8"));

// NLP setup
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Helper function to process text
function processText(text) {
    const tokens = tokenizer.tokenize(text.toLowerCase());
    return tokens.map(token => stemmer.stem(token)).join(" ");
}

// Function to generate response based on message
function generateResponse(userMessage) {
    const processedMessage = processText(userMessage);

    // Check for contextual responses
    const contextResponse = generateContextualResponse(userMessage);
    if (contextResponse) {
        return contextResponse;
    }

    // Check for name-based responses
    const nameResponse = generateNameBasedResponse(userMessage);
    if (nameResponse) {
        return nameResponse;
    }

    // Find a matching answer from the JSON data
    for (const item of data.data) {
        const processedQuestion = processText(item.question);
        if (processedQuestion.includes(processedMessage)) {
            const randomIndex = Math.floor(Math.random() * item.answers.length);
            return item.answers[randomIndex];
        }
    }
    
    // Default response if no match is found
    return "I'm not sure how to respond to that. Can you please rephrase?";
}

// Function to generate contextual responses
function generateContextualResponse(message) {
    const questionPatterns = {
        who: /who\s+is\s+(\w+)/i,
        when: /when\s+was\s+(\w+)/i,
        how: /how\s+do\s+you\s+(\w+)/i,
        what: /what\s+is\s+(\w+)/i,
        where: /where\s+is\s+(\w+)/i
    };

    for (const [key, regex] of Object.entries(questionPatterns)) {
        const match = message.match(regex);
        if (match && match[1]) {
            const topic = match[1];
            return getContextualInformation(key, topic);
        }
    }

    return null;
}

// Function to get contextual information (placeholder)
function getContextualInformation(type, topic) {
    // Replace this with actual logic or data retrieval
    const responses = {
        who: `The person or entity you're asking about is ${topic}.`,
        when: `The time or date related to ${topic} is not available in my records.`,
        how: `To perform the action related to ${topic}, follow these steps: ...`,
        what: `The information about ${topic} is not available at the moment.`,
        where: `The location related to ${topic} is not provided in the data.`
    };
    return responses[type] || "I don't have information on that topic.";
}

// Function to generate name-based responses
function generateNameBasedResponse(message) {
    const nameRegex = /\b(?:the name of|what is|who is)\s+(\w+)\b/i;
    const match = message.match(nameRegex);
    if (match && match[1]) {
        const name = match[1];
        return `The name of ${name} is ${getNameInfo(name)}.`;
    }
    return null;
}

// Function to get name information (placeholder)
function getNameInfo(name) {
    // Replace this with actual logic or data retrieval
    return "ChatBot"; // Example response
}

// Route for chat messages
app.get("/chat", (req, res) => {
    const userMessage = req.query.message;
    if (!userMessage) {
        return res.status(400).send("Message query parameter is required");
    }

    const response = generateResponse(userMessage);
    res.send(response);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
