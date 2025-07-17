require("dotenv").config();
const express = require("express");
const axios = require("axios");
const { v4: uuidv4 } = require("uuid");
const fs = require("fs");
const path = require("path");
const textToSpeech = require("./tts");
const app = express();

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

app.post("/voice", async (req, res) => {
  const twiml = `
    <Response>
      <Say voice="Polly.Joanna" language="en-US">Hi, this is Neuorial. Talk to me.</Say>
      <Record timeout="3" maxLength="10" action="/recording" method="POST" />
    </Response>
  `;
  res.type("text/xml").send(twiml);
});

app.post("/recording", async (req, res) => {
  const recordingUrl = req.body.RecordingUrl;
  console.log("📞 New Recording URL:", recordingUrl);

  try {
    const whisperResponse = await axios.post("http://localhost:5000/whisper", {
      url: recordingUrl,
    });

    const userText = whisperResponse.data.text;
    console.log("🗣️ User said:", userText);

    const gptResponse = await axios.post(
      `${process.env.AZURE_OPENAI_ENDPOINT}openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=2024-02-15-preview`,
      {
        messages: [
          {
            role: "system",
            content: "You are Neuorial AI agent. Respond naturally.",
          },
          {
            role: "user",
            content: userText,
          },
        ],
        max_tokens: 100,
        temperature: 0.5,
      },
      {
        headers: {
          "api-key": process.env.AZURE_OPENAI_KEY,
          "Content-Type": "application/json",
        },
      }
    );

    const reply = gptResponse.data.choices[0].message.content;
    console.log("🤖 GPT Reply:", reply);

    const mp3Path = await textToSpeech(reply);
    const absolutePath = path.resolve(mp3Path);

    res.type("text/xml").send(`
      <Response>
        <Play>${req.protocol}://${req.headers.host}/play/${path.basename(absolutePath)}</Play>
        <Redirect>/voice</Redirect>
      </Response>
    `);
  } catch (err) {
    console.error("❌ Error:", err.message);
    res.type("text/xml").send(`<Response><Say>Sorry, something went wrong.</Say></Response>`);
  }
});

app.get("/play/:filename", (req, res) => {
  const filePath = path.join(__dirname, "recordings", req.params.filename);
  res.sendFile(filePath);
});

app.listen(3000, () => {
  console.log("🚀 Server running on port 3000");
});
