const express = require("express");
const natural = require("natural");
const cors = require("cors");
const pos = require("pos");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const cheerio = require("cheerio");
const htmlToText = require('html-to-text');

const app = express();
const PORT = process.env.PORT || 3000;
const data = require("./hamza.json");

app.use(cors());

app.use(express.static(path.join(__dirname, "public")));

app.get("/chat", async (req, res) => {
    const userMessage = req.query.message.toLowerCase();
    let response = generateResponse(userMessage);

    if (containsMathExpression(userMessage)) {
        const calculationResult = evaluateMathExpression(userMessage);
        response = `Your result: ${calculationResult} - <br>`;
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
        response += ` I think you may know about ${informationSentences.join(" ")}. Please provide me more information about this, so I can remember it for next time.`;
    }

    const matchedAnswer = findMatchingAnswer(userMessage);
    if (!matchedAnswer) {
        response += " Thanks for assisting us.";
        try {
            const googleResult = await searchGoogle(userMessage);
            saveInformationToJSON(userMessage, [googleResult]);
            response += ` ${googleResult}. I'll remember this for next time.`;
        } catch (error) {
            console.error("Error searching Google:", error);
        }
    } else {
        response = matchedAnswer; // Return only the matched answer to avoid duplication
    }

    res.send(response);
});

function containsMathExpression(message) {
    const mathRegex = /(?:\s|^)(\d+(?:\.\d+)?(?:[\+\-\*\/\^]\d+(?:\.\d+)?)+)(?:\s|$)/g;
    const matches = message.match(mathRegex);
    return matches ? matches.map(match => match.trim()) : null;
}

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
        return `I think ${description}`;
    } catch (error) {
        throw error;
    }
}

function generateResponse(userMessage) {
    const matchedAnswer = findMatchingAnswer(userMessage);
    if (matchedAnswer) {
        return matchedAnswer;
    }

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
    return sentences.filter((sentence) => sentence.toLowerCase().includes("information"));
}

function escapeHTML(html) {
    return html.replace(/&/g, '&amp;')
               .replace(/</g, '&lt;')
               .replace(/>/g, '&gt;')
               .replace(/"/g, '&quot;')
               .replace(/'/g, '&#39;');
}

function saveInformationToJSON(uq, informationSentences) {
    const combinedHTML = informationSentences.join(" ");
    const escapedHTML = escapeHTML(combinedHTML);

    const newData = {
        question: uq + " " + escapedHTML.trim(),
        answer: escapedHTML.trim(),
    };

    data.data.push(newData);
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
        "Of course!",
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
        "Thanks for appropriating us"
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
}

function isGreeting(userMessage) {
    const greetings = ["hello", "hi", "hey", "greetings", "what's up", "howdy", "thanks"];
    return greetings.includes(userMessage.toLowerCase());
}

function findMatchingAnswer(userMessage) {
    const lowerCaseMessage = userMessage.toLowerCase();

    for (const item of data.data) {
        const lowerCaseQuestion = item.question.toLowerCase();

        if (lowerCaseQuestion.includes(lowerCaseMessage)) {
            console.log("Question found:", item.question);
            console.log("Answer type:", Array.isArray(item.answers) ? "Array" : typeof item.answers);

            if (Array.isArray(item.answers)) {
                const randomIndex = Math.floor(Math.random() * item.answers.length);
                console.log("Random index selected:", randomIndex);
                return item.answers[randomIndex];
            } else {
                return item.answers;
            }
        }
    }

    console.log("No matching question found for:", userMessage);
    return null;
}

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
