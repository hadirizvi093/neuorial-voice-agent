const fs = require("fs");
const sdk = require("microsoft-cognitiveservices-speech-sdk");
const path = require("path");

module.exports = function textToSpeech(text) {
  return new Promise((resolve, reject) => {
    const speechConfig = sdk.SpeechConfig.fromSubscription(
      process.env.AZURE_TTS_KEY,
      process.env.AZURE_TTS_REGION
    );
    const fileName = `response-${Date.now()}.mp3`;
    const filePath = path.join(__dirname, "recordings", fileName);
    const audioConfig = sdk.AudioConfig.fromAudioFileOutput(filePath);

    speechConfig.speechSynthesisVoiceName = "en-US-JennyNeural";

    const synthesizer = new sdk.SpeechSynthesizer(speechConfig, audioConfig);
    synthesizer.speakTextAsync(
      text,
      result => {
        synthesizer.close();
        resolve(filePath);
      },
      err => {
        synthesizer.close();
        reject(err);
      }
    );
  });
};
