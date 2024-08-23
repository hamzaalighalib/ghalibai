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
    console.error("Error loading or parsing data.json:", error.message);
}

// Initialize NLP tools
const tokenizer = new natural.WordTokenizer();
const stemmer = natural.PorterStemmer;

// Simple similarity function
function calculateSimilarity(question1, question2) {
    const tokens1 = tokenizer.tokenize(question1.toLowerCase());
    const tokens2 = tokenizer.tokenize(question2.toLowerCase());
    const stemmedTokens1 = tokens1.map(token => stemmer.stem(token));
    const stemmedTokens2 = tokens2.map(token => stemmer.stem(token));
    const commonTokens = stemmedTokens1.filter(token => stemmedTokens2.includes(token));
    return commonTokens.length / stemmedTokens1.length;
}

// Predict based on input
function predict(inputText) {
    let bestMatchIndex = -1;
    let highestSimilarity = 0;

    for (let i = 0; i < qaData.length; i++) {
        const similarity = calculateSimilarity(inputText, qaData[i].question);
        if (similarity > highestSimilarity) {
            highestSimilarity = similarity;
            bestMatchIndex = i;
        }
    }

    if (bestMatchIndex !== -1) {
        const answers = qaData[bestMatchIndex].answers;
        const randomIndex = Math.floor(Math.random() * answers.length);
        return answers[randomIndex]; // Return a random answer
    }
 else {
        return "I'm not sure I understand. Can you try asking something else?";
    }
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
