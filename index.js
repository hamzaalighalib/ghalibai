const express = require("express");
const natural = require("natural");
const cors = require("cors");
const pos = require("pos");
const fs = require("fs");
const path = require("path");
const axios = require("axios");
const data = require("./hamza.json");
const OpenAI = require("openai");

const app = express();
const PORT = process.env.PORT || 3000;

const openai = new OpenAI({
    apiKey: "sk-proj-QcTM6rJboHHw1v75daJPT3BlbkFJlPPvToPphodkBzfrlkY2",
});

app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

app.get("/chat", async (req, res) => {
    const userMessage = req.query.message.toLowerCase();
    let response = await generateResponse(userMessage);

    const mathExpression = containsMathExpression(userMessage);
    if (mathExpression) {
        const calculationResult = evaluateMathExpression(mathExpression);
        response += ` Your result: ${calculationResult}`;
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

    res.send(response);
});

async function generateResponse(userMessage) {
    const matchedAnswer = findMatchingAnswer(userMessage);
    if (matchedAnswer) {
        return matchedAnswer;
    }

    try {
        const chatCompletion = await openai.chat.completions.create({
            messages: [{ role: "user", content: userMessage }],
            model: "gpt-4",
        });

        const aiResponse = chatCompletion.choices[0].message.content.trim();
        return aiResponse;
    } catch (error) {
        console.error("Error fetching response from OpenAI:", error);
        return "Sorry, I couldn't fetch a response at this time.";
    }
}

function containsMathExpression(message) {
    const mathRegex = /(?:\s|^)(\d+(?:\.\d+)?(?:[\+\-\*\/\^]\d+(?:\.\d+)?)+)(?:\s|$)/g;
    const matches = message.match(mathRegex);
    return matches ? matches[0].trim() : null;
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
        "Thanks for appropriating us",
    ];
    return greetings[Math.floor(Math.random() * greetings.length)];
}

function isGreeting(userMessage) {
    const greetings = ["hello", "hi", "hey", "greetings", "what's up", "howdy", "thanks"];
    return greetings.includes(userMessage.toLowerCase());
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
    fs.writeFileSync("./hamza.json", JSON.stringify(data, null, 2));
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
