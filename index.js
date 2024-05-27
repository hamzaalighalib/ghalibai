const express = require("express");

const pos = require("pos");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");

const use = require('@tensorflow-models/universal-sentence-encoder');

const app = express();
const PORT = process.env.PORT || 3000;
const data = require("./hamza.json");

let model;

// Load the Universal Sentence Encoder model
async function loadModel() {
    model = await use.load();
    console.log("Model loaded.");
}

// Call the loadModel function to load the model when the server starts
loadModel();

app.use(express.static(path.join(__dirname, "public")));

app.get("/chat", async (req, res) => {
    const userMessage = req.query.message.toLowerCase();
    let response = await generateResponse(userMessage);

    // Math...
    if (containsMathExpression(userMessage)) {
        const calculationResult = evaluateMathExpression(userMessage);
        response = `Your result: ${calculationResult} - <br>` + response;
    }

    if (userMessage.includes("oh") || userMessage.includes("oops")) {
        response += " " + generateRandomInterjectionResponse();
    }

    if (isGreeting(userMessage)) {
        response += " " + generateRandomGreetingResponse();
    }

    if (isInformation(userMessage)) {
        const informationSentences = extractInformation(userMessage);
        saveInformationToJSON(userMessage, informationSentences);
        response += `I think you may know about ${informationSentences.join(" ")}. Please provide me more information about this, so I can remember it for next time.`;
    }

    const matchedAnswer = await findMatchingAnswer(userMessage);
    if (!matchedAnswer) {
        response += " Thanks for assisting us.";
        try {
            const googleResult = await searchGoogle(userMessage);
            saveInformationToJSON(userMessage, [googleResult]);
            response += `${googleResult}. I'll remember this for next time.`;
        } catch (error) {
            console.error("Error searching Google:", error);
        }
    } else {
        response += " " + matchedAnswer;
    }

    res.send(response);
});

// Function to find the most similar question
async function findMatchingAnswer(userMessage) {
    const lowerCaseMessage = userMessage.toLowerCase();
    const inputEmbedding = await model.embed([lowerCaseMessage]);
    const questionEmbeddings = await model.embed(data.data.map(item => item.question.toLowerCase()));

    let maxSimilarity = -Infinity;
    let mostSimilarQuestionIndex = -1;

    questionEmbeddings.arraySync().forEach((embedding, index) => {
        const similarity = cosineSimilarity(inputEmbedding.arraySync()[0], embedding);
        if (similarity > maxSimilarity) {
            maxSimilarity = similarity;
            mostSimilarQuestionIndex = index;
        }
    });

    if (mostSimilarQuestionIndex !== -1) {
        const matchedQuestion = data.data[mostSimilarQuestionIndex];
        console.log("Question found:", matchedQuestion.question);
        if (Array.isArray(matchedQuestion.answers)) {
            const randomIndex = Math.floor(Math.random() * matchedQuestion.answers.length);
            console.log("Random index selected:", randomIndex);
            return matchedQuestion.answers[randomIndex];
        } else {
            return matchedQuestion.answers;
        }
    }

    console.log("No matching question found for:", userMessage);
    return null;
}

// Function to calculate cosine similarity
function cosineSimilarity(a, b) {
    const dotProduct = a.reduce((sum, val, i) => sum + val * b[i], 0);
    const magnitudeA = Math.sqrt(a.reduce((sum, val) => sum + val * val, 0));
    const magnitudeB = Math.sqrt(b.reduce((sum, val) => sum + val * val, 0));
    return dotProduct / (magnitudeA * magnitudeB);
}

// Function to check if the message contains a mathematical expression
function containsMathExpression(message) {
    const mathRegex = /(?:\s|^)(\d+(?:\.\d+)?(?:[\+\-\*\/\^]\d+(?:\.\d+)?)+)(?:\s|$)/g;
    const matches = message.match(mathRegex);
    if (matches) {
        const expressions = matches.map((match) => match.trim());
        return expressions;
    }
    return null;
}

// Function to evaluate a mathematical expression
function evaluateMathExpression(expression) {
    try {
        const result = eval(expression);
        return result;
    } catch (error) {
        console.error("Error evaluating math expression:", error);
        return "Sorry, I couldn't evaluate that expression.";
    }
}

async function searchGoogle(query) {
    const googleSearchUrl = `https://www.google.com/search?q=${encodeURIComponent(query)}`;
    try {
        const response = await axios.get(googleSearchUrl);
        const html = response.data;
        const $ = cheerio.load(html);
        const description = $("div.BNeawe.vvjwJb.AP7Wnd").first().text();
        const responseText = `I think ${description}`;
        return responseText;
    } catch (error) {
        throw error;
    }
}

async function generateResponse(userMessage) {
    const matchedAnswer = await findMatchingAnswer(userMessage);
    if (matchedAnswer) {
        return matchedAnswer;
    }

    const taggedWords = new pos.Lexer().lex(userMessage);
    const tagger = new pos.Tagger();
    const taggedWordsWithPOS = tagger.tag(taggedWords);

    const nouns = extractNouns(userMessage);
    const verbs = extractVerbs(userMessage);

    if (nouns.length > 0 && verbs.length > 0) {
        return `It appears you're inquiring about ${nouns.join(" ")} and expressing interest in ${verbs.join(" ")}.`;
    } else if (nouns.length > 0) {
        return `You've mentioned ${nouns.join(" ")}. Can you provide more details on that?`;
    } else if (verbs.length > 0) {
        return `You seem interested in ${verbs.join(" ")}. What specific information are you seeking?`;
    } else {
        return "I'm sorry, I didn't quite catch that. Could you please provide more context?";
    }
}

function extractNouns(userMessage) {
    const taggedWords = new pos.Lexer().lex(userMessage);
    const tagger = new pos.Tagger();
    const taggedWordsWithPOS = tagger.tag(taggedWords);
    const nouns = [];
    taggedWordsWithPOS.forEach((word) => {
        if (word[1] === "NN" || word[1] === "NNS") {
            nouns.push(word[0]);
        }
    });
    return nouns;
}

function extractVerbs(userMessage) {
    const taggedWords = new pos.Lexer().lex(userMessage);
    const tagger = new pos.Tagger();
    const taggedWordsWithPOS = tagger.tag(taggedWords);
    const verbs = [];
    taggedWordsWithPOS.forEach((word) => {
        if (word[1].startsWith("VB")) {
            verbs.push(word[0]);
        }
    });
    return verbs;
}

function isInformation(userMessage) {
    return userMessage.includes("information");
}

function extractInformation(userMessage) {
    const sentences = userMessage.split(/[.!?]/);
    const informationSentences = sentences.filter((sentence) =>
        sentence.toLowerCase().includes("information")
    );
    return informationSentences;
}

function escapeHTML(html) {
    return html
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#39;");
}

function saveInformationToJSON(uq, informationSentences) {
    const combinedHTML = informationSentences.join(" ");
    const escapedHTML = escapeHTML(combinedHTML);

    const newData = {
        question: uq,
        answers: [escapedHTML.trim()],
    };

    data.data.push(newData);

    fs.writeFile("./hamza.json", JSON.stringify(data, null, 2), (err) => {
        if (err) {
            console.error("Error writing to hamza.json:", err);
        } else {
            console.log("Data added to hamza.json:", newData);
        }
    });
}

function generateRandomInterjectionResponse() {
    const interjections = [
        "Nice!",
        "Cool!",
        "Awesome!",
        "Sweet!",
        "Great!",
        "Fantastic!",
        "Amazing!",
        "Wow!",
        "Woww!",
        "Wowww!",
        "Wowwww!",
        "Wowwwww!",
        "Nice!",
        "Of course!",
        "",
    ];
    return interjections[Math.floor(Math.random() * interjections.length)];
}

function generateRandomGreetingResponse() {
    const greetings = [
        "Hello!",
        "Hi there!",
        "Hey!",
        "Greetings!",
        "What's up?",
        "Howdy!",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
}

function isGreeting(userMessage) {
    const greetings = ["hello", "hi", "hey", "greetings", "what's up", "howdy"];
    return greetings.includes(userMessage.toLowerCase());
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
