const express = require("express");
const cors = require("cors");
const compromise = require("compromise");
const natural = require("natural");
const fs = require("fs");
const path = require("path");
const math = require("mathjs");
const cheerio = require("cheerio");

// Initialize Express
const app = express();
app.use(cors());
app.use(express.json());
const PORT = process.env.PORT || 3000;

// Serve static files from the 'public' directory
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

// Preprocess text with POS tags
function preprocessText(text) {
    let doc = compromise(text);
    return {
        text: doc.text().toLowerCase(),
        tags: {
            nouns: doc.nouns().out('array'),
            pronouns: doc.pronouns().out('array'),
            verbs: doc.verbs().out('array')
        }
    };
}

// Calculate similarity based on text and POS tags
function calculateSimilarity(text1, text2, tags1, tags2) {
    const words1 = new Set(text1.split(" "));
    const words2 = new Set(text2.split(" "));
    const intersection = [...words1].filter(word => words2.has(word)).length;
    const union = new Set([...words1, ...words2]).size;

    // Enhance similarity score based on POS tags
    let tagScore = 0;
    tags1.nouns.forEach(noun => {
        if (tags2.nouns.includes(noun)) tagScore += 0.2;
    });
    tags1.verbs.forEach(verb => {
        if (tags2.verbs.includes(verb)) tagScore += 0.2;
    });
    tags1.pronouns.forEach(pronoun => {
        if (tags2.pronouns.includes(pronoun)) tagScore += 0.1;
    });

    return (intersection / union) + tagScore;
}

// Generate a response with grammar-based variations
function generateResponse(answers) {
    if (answers.length === 0) return ["Oops, I don't have an answer for that."];

    // Create a simple text generation response
    const responses = [
        "Here's what I found:",
        "Take a look at this:",
        "I hope this helps:",
        "Check this out:"
    ];
    const randomResponse = responses[Math.floor(Math.random() * responses.length)];

    return [`${randomResponse} ${answers.join(" ")}`];
}

// Find the best answer
function findBestAnswer(question) {
    const { text: processedQuestion, tags: questionTags } = preprocessText(question);

    let bestMatch = null;
    let highestScore = 0;

    qaData.forEach(item => {
        if (item.question && item.answers) {
            const { text: processedItemQuestion, tags: itemTags } = preprocessText(item.question);
            const score = calculateSimilarity(processedQuestion, processedItemQuestion, questionTags, itemTags);

            if (score > highestScore) {
                highestScore = score;
                bestMatch = item.answers; // Return all answers
            }
        }
    });

    return bestMatch && bestMatch.length > 0 ? generateResponse(bestMatch) : generateResponse([]);
}

// Evaluate mathematical expressions
function evaluateMathExpression(text) {
    try {
        return math.evaluate(text).toString();
    } catch (error) {
        return null;
    }
}

// Search Google and scrape content
async function searchGoogle(query) {
    const searchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    try {
        const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
        const response = await fetch(searchUrl);
        const body = await response.text();
        const $ = cheerio.load(body);

        let links = [];
        $('a').each((index, element) => {
            if (index < 5) { // Scrape 5 links
                const href = $(element).attr('href');
                if (href && href.startsWith('/url?q=')) {
                    links.push(decodeURIComponent(href.split('/url?q=')[1].split('&')[0]));
                }
            }
        });

        return links;
    } catch (error) {
        console.error("Error fetching search results:", error.message);
        return [];
    }
}

// Fetch and process content from links
async function fetchAndProcessContent(links) {
    let content = [];
    for (const link of links) {
        try {
            const fetch = (...args) => import('node-fetch').then(({ default: fetch }) => fetch(...args));
            const response = await fetch(link);
            const body = await response.text();
            const $ = cheerio.load(body);
            content.push($('body').text().slice(0, 500)); // Extract first 500 characters
        } catch (error) {
            console.error("Error fetching or processing link:", error.message);
        }
    }
    return content;
}

// Route for chat messages
app.get("/chat", async (req, res) => {
    const userMessage = req.query.message;
    if (!userMessage) {
        return res.status(400).send("Message query parameter is required");
    }

    let response = findBestAnswer(userMessage);

    if (response.includes("Oops, I don't have an answer for that.")) {
        const mathResult = evaluateMathExpression(userMessage);
        if (mathResult) {
            response = [`Here's the result: ${mathResult}. I hope this helps!`];
        } else {
            const searchResults = await searchGoogle(userMessage);
            const fetchedContent = await fetchAndProcessContent(searchResults);

            if (fetchedContent.length > 0) {
                response = [`Here's some information I found: ${fetchedContent[0]}`];
            } else {
                response = generateResponse([]);
            }
        }
    }

    // Convert the response array to a plain text string
    const responseText = response.join(" ");

    // Send the response as plain text
    res.send(responseText);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
