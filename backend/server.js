require("dotenv").config();

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const http = require("http");
const { Server } = require("socket.io");

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 3000;
const VERIFY_TOKEN = process.env.META_VERIFY_TOKEN;
const ACCESS_TOKEN = process.env.META_ACCESS_TOKEN;
const FORM_ID = process.env.META_FORM_ID;
const GRAPH_API_VERSION = process.env.GRAPH_API_VERSION || "v23.0";
const POLL_INTERVAL_MS = 5000;

app.use(cors());
app.use(express.json());

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
});

// ---------- In-memory lead store (shared by webhook + polling) ----------
const leads = []; // newest first
const seen = new Set();

function addLead(lead, source) {
  if (!lead || !lead.id || seen.has(lead.id)) return false;
  seen.add(lead.id);
  leads.unshift(lead);
  io.emit("new_lead", lead);
  console.log(`New lead (${source}):`, lead.id);
  return true;
}

// 1. Health check
app.get("/", (req, res) => {
  res.json({
    message: "Meta Lead Ads backend is running",
    status: "ok",
    leads: leads.length,
  });
});

// 2. All leads so far (the app calls this on mount)
app.get("/leads", (req, res) => {
  res.json(leads);
});

// 3. Temporary test endpoint for the mobile app
app.get("/test-lead", (req, res) => {
  const testLead = {
    id: `test-lead-${Date.now()}`,
    created_time: new Date().toISOString(),
    field_data: [
      { name: "full_name", values: ["Ajinkya Test"] },
      { name: "email", values: ["test@example.com"] },
      { name: "phone_number", values: ["9876543210"] },
    ],
  };

  addLead(testLead, "test-lead");

  res.json({
    success: true,
    message: "Test lead sent to mobile app",
  });
});

// 4. Retrieve one real Meta test lead by id:
//    http://localhost:3000/test-meta-lead?id=1802567161306859
app.get("/test-meta-lead", async (req, res) => {
  try {
    const leadId = req.query.id || "1802567161306859";
    const lead = await fetchAndBroadcastLead(leadId);

    res.json({
      success: true,
      message: "Meta test lead retrieved and broadcast",
      lead,
    });
  } catch (error) {
    const details = error.response?.data || error.message;

    console.error("Meta test lead error:", details);

    res.status(500).json({
      success: false,
      error: details,
    });
  }
});

// 5. Meta webhook verification
app.get("/webhook", (req, res) => {
  const mode = req.query["hub.mode"];
  const token = req.query["hub.verify_token"];
  const challenge = req.query["hub.challenge"];

  if (mode === "subscribe" && token === VERIFY_TOKEN) {
    console.log("Meta webhook verified successfully");
    return res.status(200).send(challenge);
  }

  return res.sendStatus(403);
});

// 6. Receive Meta webhook events
app.post("/webhook", (req, res) => {
  const body = req.body;

  if (body.object !== "page") {
    return res.sendStatus(404);
  }

  // Acknowledge Meta before processing the event
  res.sendStatus(200);

  if (!Array.isArray(body.entry)) return;

  for (const entry of body.entry) {
    for (const change of entry.changes || []) {
      if (change.field !== "leadgen") continue;

      const leadId = change.value?.leadgen_id;

      if (!leadId) {
        console.warn("Webhook received without a lead ID");
        continue;
      }

      console.log("Meta lead webhook received:", leadId);

      fetchAndBroadcastLead(leadId).catch((error) => {
        console.error(
          "Could not process Meta lead:",
          error.response?.data || error.message
        );
      });
    }
  }
});

// 7. Fetch one lead from Meta, then store + broadcast it
async function fetchAndBroadcastLead(leadId) {
  if (!ACCESS_TOKEN || ACCESS_TOKEN === "token") {
    throw new Error("Set a valid META_ACCESS_TOKEN in backend/.env");
  }

  const url = `https://graph.facebook.com/${GRAPH_API_VERSION}/${leadId}`;

  const response = await axios.get(url, {
    params: {
      fields: "id,created_time,field_data",
      access_token: ACCESS_TOKEN,
    },
  });

  const lead = response.data;

  console.log("Meta lead retrieved successfully:", lead.id);
  addLead(lead, "webhook");

  return lead;
}

// 8. Fallback: poll the form's test leads (Meta's test webhook push can stay Pending).
//    Use /leads instead of /test_leads for real (non-test) leads.
let firstPoll = true;

async function pollLeads() {
  if (!FORM_ID || !ACCESS_TOKEN) return;

  try {
    const r = await axios.get(
      `https://graph.facebook.com/${GRAPH_API_VERSION}/${FORM_ID}/test_leads`,
      {
        params: {
          fields: "id,created_time,field_data",
          access_token: ACCESS_TOKEN,
        },
      }
    );

    const items = (r.data.data || []).slice().reverse(); // oldest first

    if (firstPoll) {
      // Load existing leads silently so the list is not empty after a restart
      items.forEach((l) => {
        if (!seen.has(l.id)) {
          seen.add(l.id);
          leads.unshift(l);
        }
      });
      firstPoll = false;
      console.log(`Initial poll loaded ${items.length} existing lead(s)`);
    } else {
      items.forEach((l) => addLead(l, "poll"));
    }
  } catch (e) {
    console.error("Poll error:", e.response?.data || e.message);
  }
}

if (FORM_ID) {
  pollLeads();
  setInterval(pollLeads, POLL_INTERVAL_MS);
} else {
  console.warn("META_FORM_ID not set - polling fallback is disabled");
}

// 9. Track connected mobile clients
io.on("connection", (socket) => {
  console.log("Mobile app connected:", socket.id);

  socket.on("disconnect", () => {
    console.log("Mobile app disconnected:", socket.id);
  });
});

// 10. Start backend server
server.listen(PORT, "0.0.0.0", () => {
  console.log(`Backend running on port ${PORT}`);
});