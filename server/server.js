
require("dotenv").config();

const express = require("express");
const cors = require("cors");
const http = require("http");
const WebSocket = require("ws");
const { MongoClient } = require("mongodb");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;
const MODEL = process.env.GEMINI_MODEL || "gemini-3.8-live";

const mongoClient = new MongoClient(process.env.MONGODB_URI);
let calls;


app.get("/api/calls", async (req, res) => {
  try {
    if (!calls) {
      return res.status(503).json({ error: "MongoDB is not connected" });
    }

    const records = await calls
      .find({})
      .sort({ createdAt: -1 })
      .limit(100)
      .toArray();

    res.json(records.map(call => ({
      ...call,
      _id: call._id.toString()
    })));
  } catch (error) {
    console.error("[Dashboard] Failed to load calls:", error.message);
    res.status(500).json({ error: "Could not load call logs" });
  }
});


const wss = new WebSocket.Server({
  server,
  path: "/gemini"
});



function extractCallDetails(transcript) {
  const callerMessages = transcript
    .filter(item => item.speaker === "You")
    .map(item => item.text)
    .filter(Boolean);

  const fullText = transcript.map(item => item.text).join(" ");
  const callerText = callerMessages.join(" ");

  function findMatch(regex) {
    const match = fullText.match(regex);
    return match ? match[1].trim().replace(/[.,!?]+$/, "") : "";
  }

  const name = findMatch(
    /\bmy name is\s+([A-Za-z][A-Za-z .'-]{0,50})/i
  ) || findMatch(
    /\bi am\s+([A-Za-z][A-Za-z'-]{1,30})(?=[,.!?]|$)/i
  );

  const location = findMatch(
    /\b(?:my address is|address is|I live at|located at|location is|I'm at|I am at)\s+([^.!?\n]{3,100})/i
  );

  const timing = findMatch(
    /\b(?:at|around|by)\s+((?:\d{1,2}(?::\d{2})?\s?(?:am|pm))|(?:morning|afternoon|evening|tonight|tomorrow|today|next week))\b/i
  ) || findMatch(
    /\b(on\s+(?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday|today|tomorrow|[A-Za-z]+\s+\d{1,2}))\b/i
  );

  const urgentWords =
    /\b(emergency|urgent|urgently|asap|immediately|dangerous|flooding|fire|gas leak|sparking|no water)\b/i;

  const urgency = urgentWords.test(fullText)
    ? "High"
    : /\b(soon|today|quickly|not working|broken|leaking)\b/i.test(fullText)
      ? "Medium"
      : "Not specified";

  const problem = callerMessages.find(text =>
    /\b(broken|leak|leaking|repair|not working|issue|problem|install|service|blocked|damaged|help|stopped)\b/i.test(text)
  ) || callerMessages[0] || "";

  const summary = callerText
    ? callerText.slice(0, 350) + (callerText.length > 350 ? "..." : "")
    : "No caller transcript captured.";

  return {
    callerName: name || "Unknown",
    location: location || "Not provided",
    problem: problem || "Not identified",
    timing: timing || "Not specified",
    urgency,
    summary
  };
}


app.get("/api/health", (req, res) => {
  res.json({
    server: "running",
    model: MODEL,
    mongodb: calls ? "connected" : "disconnected"
  });
});


app.post("/api/calls", async (req, res) => {
  try {
    if (!calls) {
      return res.status(503).json({ error: "MongoDB is not connected" });
    }

    const { transcript, startedAt, endedAt } = req.body;

    if (!Array.isArray(transcript) || transcript.length === 0) {
      return res.status(400).json({ error: "Transcript is empty" });
    }

    const details = extractCallDetails(transcript);

    const result = await calls.insertOne({
      ...details,
      transcript,
      startedAt: startedAt || null,
      endedAt: endedAt || new Date().toISOString(),
      createdAt: new Date()
    });

    console.log("[MongoDB] Call saved:", result.insertedId.toString());

    res.status(201).json({
      success: true,
      id: result.insertedId.toString(),
      details
    });
  } catch (error) {
    console.error("[MongoDB] Save failed:", error.message);
    res.status(500).json({ error: "Could not save call" });
  }
});


wss.on("connection", browser => {
  console.log("[Browser] Connected");

  const url =
    "wss://generativelanguage.googleapis.com/ws/" +
    "google.ai.generativelanguage.v1beta.GenerativeService.BidiGenerateContent" +
    "?key=" + encodeURIComponent(process.env.GEMINI_API_KEY);

  const gemini = new WebSocket(url);

  let ready = false;

  gemini.on("open", () => {
    console.log("[Gemini] WebSocket open. Sending setup...");

    gemini.send(JSON.stringify({
      setup: {
        model: `models/${MODEL}`,
        generationConfig: {
          responseModalities: ["AUDIO"],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: "Aoede"
              }
            }
          }
        },
        systemInstruction: {
          parts: [{
            text:
              "You are a friendly home-service receptionist your name is 'seraj ai' and you are built by seraj. " +
              "Greet the caller and ask what they need help with. " +
              "Ask one question at a time. Collect their name, " +
              "service address, issue, preferred date and time. " +
              "claim a real booking has been made."
          }]
        },
        inputAudioTranscription: {},
        outputAudioTranscription: {}
      }
    }));
  });

  gemini.on("message", data => {
    const raw = data.toString();

    try {
      const message = JSON.parse(raw);

      if (message.setupComplete) {
        ready = true;
        console.log("[Gemini] SETUP COMPLETE");
      }

      if (message.error) {
        console.log("[Gemini] API ERROR:", JSON.stringify(message.error));
      }

      if (message.serverContent) {
        console.log("[Gemini] Received server content");
      }
    } catch {
      console.log("[Gemini] Received non-JSON message");
    }

    if (browser.readyState === WebSocket.OPEN) {
      browser.send(raw);
    }
  });

  gemini.on("error", error => {
    console.log("[Gemini] SOCKET ERROR:", error.message);
  });

  gemini.on("close", (code, reason) => {
    console.log("[Gemini] CLOSED:", code, reason.toString());
    ready = false;

    if (browser.readyState === WebSocket.OPEN) {
      browser.send(JSON.stringify({
        proxyStatus: "gemini_closed",
        code,
        reason: reason.toString()
      }));
    }
  });

  browser.on("message", data => {
    if (!ready || gemini.readyState !== WebSocket.OPEN) {
      console.log("[Proxy] Ignoring message because Gemini is not ready");
      return;
    }

    gemini.send(data);
  });

  browser.on("close", () => {
    console.log("[Browser] Disconnected");
    gemini.close();
  });

  browser.on("error", error => {
    console.log("[Browser] ERROR:", error.message);
  });
});

async function start() {
  await mongoClient.connect();
  calls = mongoClient.db(process.env.DB_NAME || "job_rescue")
    .collection("calls");

  console.log("[MongoDB] Connected");

  server.listen(PORT, () => {
    console.log(`[Server] http://localhost:${PORT}`);
    console.log(`[Server] Gemini model: ${MODEL}`);
  });
}

start().catch(error => {
  console.log("[Startup] ERROR:", error.message);
});
