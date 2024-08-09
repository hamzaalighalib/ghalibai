const express = require("express");
const cors = require("cors");
const fs = require("fs");
const path = require("path");
const natural = require("natural");
const axios = require("axios");
const cheerio = require("cheerio");
const querystring = require("querystring");

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
async function generateResponse(userMessage) {
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

    // Check for information queries and fetch data
    if (isInformationQuery(userMessage)) {
        return await fetchAndGenerateArticle(userMessage);
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

// Function to check if the query is asking for information
function isInformationQuery(message) {
    return /information|details|facts|about/i.test(message);
}

// Function to search Google for URLs (using scraping)
async function searchGoogle(query) {
    try {
        const searchQuery = querystring.stringify({ q: query });
        const searchURL = `https://www.google.com/search?${searchQuery}`;
        
        const response = await axios.get(searchURL, { headers: { 'User-Agent': 'Mozilla/5.0' } });
        const $ = cheerio.load(response.data);
        const urls = [];
        
        $('a').each((i, element) => {
            const href = $(element).attr('href');
            if (href && href.startsWith('/url?q=')) {
                const url = new URL(href.substring(7), 'https://www.google.com').href;
                urls.push(url);
            }
        });

        return urls.slice(0, 3); // Limit to 3 results
    } catch (error) {
        console.error("Error searching Google:", error);
        return [];
    }
}

// Function to fetch and generate an article based on a query
async function fetchAndGenerateArticle(query) {
    try {
        // Search Google for relevant URLs
        const urls = await searchGoogle(query);
        const articleContent = await scrapeAndSummarize(urls);
        return articleContent;
    } catch (error) {
        console.error("Error fetching or generating article:", error);
        return "Sorry, I couldn't generate an article at this time.";
    }
}

// Function to scrape and summarize content from URLs
async function scrapeAndSummarize(urls) {
    let fullText = "";
    for (const url of urls) {
        try {
            const response = await axios.get(url, { headers: { 'User-Agent': 'Mozilla/5.0' } });
            const $ = cheerio.load(response.data);
            const text = $('body').text(); // Extract all text from the body
            fullText += text + " ";
        } catch (error) {
            console.error("Error scraping URL:", url, error);
        }
    }

    // Generate a summary or article from the combined text
    return summarizeText(fullText);
}

// Function to summarize text (basic implementation)
function summarizeText(text) {
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    return lines.slice(0, 20).join('\n'); // Return the first 20 lines
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
    return "ChatBot"; // Example response
}

// Route for chat messages
app.get("/chat", async (req, res) => {
    const userMessage = req.query.message;
    if (!userMessage) {
        return res.status(400).send("Message query parameter is required");
    }

    const response = await generateResponse(userMessage);
    res.send(response);
});

// Start the server
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
