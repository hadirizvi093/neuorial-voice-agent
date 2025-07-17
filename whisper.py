import requests
import whisper
from flask import Flask, request, jsonify
from pydub import AudioSegment
import os
from io import BytesIO

app = Flask(__name__)
model = whisper.load_model("base")

@app.route('/whisper', methods=['POST'])
def transcribe():
    data = request.json
    url = data.get("url")

    if not url:
        return jsonify({"error": "No URL provided"}), 400

    print("📥 Received audio URL:", url)

    try:
        response = requests.get(f"{url}.mp3")
        if response.status_code != 200:
            raise Exception("Failed to fetch audio")

        audio = AudioSegment.from_mp3(BytesIO(response.content))
        os.makedirs("recordings", exist_ok=True)
        audio.export("recordings/audio.wav", format="wav")
        print("🎧 Audio downloaded and saved")

        result = model.transcribe("recordings/audio.wav")
        print("📝 Transcription:", result["text"])

        return jsonify({"text": result["text"]})

    except Exception as e:
        print("❌ Error:", str(e))
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    print("🐍 Whisper Connected")
    app.run(host="0.0.0.0", port=5000)
