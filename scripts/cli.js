const axios = require("axios");
const fs = require("fs");
const path = require("path");
const { v4: uuidv4 } = require("uuid");

const configPath = path.join(__dirname, "..", "src", "config", "config.json");
const config = JSON.parse(fs.readFileSync(configPath, "utf8"));

async function createTestLead() {
  const payload = {
    source: "WALK_IN",
    full_name: "Test Lead",
    phone: "+27760000000",
    whatsapp_opt_in: "YES",
    assigned_to: "FRONT_DESK",
    package_interest: "12M",
    consent_timestamp: new Date().toISOString()
  };
  const response = await axios.post("http://localhost:3000/webhooks/lead", payload);
  console.log(response.data);
}

async function simulateInbound() {
  const payload = {
    lead_id: uuidv4(),
    phone: "+27760000000",
    message: "price"
  };
  const response = await axios.post("http://localhost:3000/webhooks/inbound", payload);
  console.log(response.data);
}

async function generateReport() {
  const { generateWeeklyReport } = require("../src/report");
  const output = await generateWeeklyReport({
    metrics: {
      week_start: "2024-01-01",
      week_end: "2024-01-07",
      total_leads: 25,
      facebook_leads: 15,
      walkin_leads: 10,
      sla_percent: "92%",
      booked_visits: 8,
      show_rate: "75%",
      joined_count: 4,
      closed_count: 5,
      cold_count: 6,
      cold_leads_table: "<tr><td>Test Lead</td><td>+27760000000</td><td>2024-01-05</td></tr>"
    },
    outputDir: path.join(__dirname, "..", "tmp")
  });
  console.log(`Report generated: ${output}`);
}

const action = process.argv[2];

if (!fs.existsSync(path.join(__dirname, "..", "tmp"))) {
  fs.mkdirSync(path.join(__dirname, "..", "tmp"));
}

if (action === "test-lead") {
  createTestLead();
} else if (action === "simulate-inbound") {
  simulateInbound();
} else if (action === "weekly-report") {
  generateReport();
} else {
  console.log("Usage: node scripts/cli.js [test-lead|simulate-inbound|weekly-report]");
}
