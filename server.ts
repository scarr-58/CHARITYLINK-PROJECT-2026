import express from "express";
import path from "path";
import fs from "fs";
import { createServer as createViteServer } from "vite";
import mysql from "mysql2/promise";
import dotenv from "dotenv";
import crypto from "crypto";

dotenv.config();

async function httpJson<T = any>(url: string, options: any): Promise<T> {
  const resp = await fetch(url, options);
  const text = await resp.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    // @ts-ignore
    return { raw: text } as T;
  }
}

// --- PASSWORD SECURITY ---
// Passwords are never stored in plain text. We derive a salted scrypt hash and
// store it as "salt:hash". Verification is done with a constant-time compare.
function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, 64).toString("hex");
  return `${salt}:${derived}`;
}

function verifyPassword(password: string, stored?: string): boolean {
  if (!stored || !stored.includes(":")) return false;
  const [salt, key] = stored.split(":");
  const keyBuffer = Buffer.from(key, "hex");
  const derived = crypto.scryptSync(password, salt, 64);
  return keyBuffer.length === derived.length && crypto.timingSafeEqual(keyBuffer, derived);
}

// Removes the password hash before a user record is sent to the client.
function sanitizeUser<T extends { password?: string }>(user: T): Omit<T, "password"> {
  const { password, ...safe } = user;
  return safe;
}

// The secret code required to self-register as an administrator. Keeping admin
// creation behind a shared secret prevents anyone from granting themselves
// elevated privileges through the public registration form.
const ADMIN_ACCESS_CODE = process.env.ADMIN_CODE || "CHARITY-ADMIN-2026";



interface Contribution {
  id: string;
  campaignId: number;
  campaignTitle: string;
  category: string;
  donorName: string;
  donorEmail: string;
  amount: number;
  timestamp: string;
  paymentMethod: string;
}

interface UserRecord {
  name: string;
  email: string;
  password?: string;
  role: string;
  photoUrl?: string;
  memberSince: string;
  totalContributed: number;
  campaignsSupported: number;
}

interface CampaignRecord {
  id: number;
  icon: string;
  category: string;
  title: string;
  org: string;
  desc: string;
  short: string;
  raised: number;
  target: number;
  donors: number;
  verified: boolean;
  impact: Array<{ num: string; lbl: string }>;
  usage: string;
  color: string;
  ownerEmail?: string;
}

interface DatabaseSchema {
  campaigns: CampaignRecord[];
  users: UserRecord[];
  contributions: Contribution[];
}

const DATA_STORE_PATH = path.join(process.cwd(), "data-store.json");

const INITIAL_CAMPAIGNS: CampaignRecord[] = [
  {
    id: 1,
    icon: "💧",
    category: "Water",
    title: "Clean Water for Turkana County Schools",
    org: "Maji Safi Initiative",
    desc: "Over 3,200 pupils in Turkana County walk more than 5 km daily to reach contaminated water sources. This campaign funds the installation of 12 solar-powered boreholes and filtration systems directly at school compounds, eliminating waterborne illness and improving attendance — especially among girls.",
    short: "Providing clean, safe water directly to 12 schools in Turkana County through solar-powered boreholes and filtration systems.",
    raised: 380000,
    target: 600000,
    donors: 214,
    verified: true,
    impact: [
      { num: "12", lbl: "Boreholes Planned" },
      { num: "3,200", lbl: "Pupils Served" },
      { num: "6", lbl: "Installed So Far" }
    ],
    usage: "65% goes to borehole drilling and equipment, 20% to solar infrastructure, 10% to maintenance training for local staff, and 5% to monitoring and reporting.",
    color: "#e8f4fd"
  },
  {
    id: 2,
    icon: "📚",
    category: "Education",
    title: "Bursary Fund for Kibera Secondary Students",
    org: "Elimu Kwanza Foundation",
    desc: "Hundreds of bright students in Kibera leave school each year not due to poor performance but because of school fee arrears. This fund pays full year tuition, exam fees, and provides learning materials for 80 Form 3 and Form 4 students who are at risk of dropping out.",
    short: "Covering full tuition and exam fees for 80 secondary school students in Kibera who risk dropping out due to financial hardship.",
    raised: 215000,
    target: 400000,
    donors: 312,
    verified: true,
    impact: [
      { num: "80", lbl: "Students Supported" },
      { num: "100%", lbl: "Exam Pass Rate" },
      { num: "KES 2,500", lbl: "Cost per Month" }
    ],
    usage: "90% directly covers school fees and learning materials. 10% is used for student welfare, mentorship events, and administrative costs.",
    color: "#fef9e7"
  },
  {
    id: 3,
    icon: "🏥",
    category: "Health",
    title: "Mobile Maternal Clinic — Marsabit",
    org: "Afya Yetu Health Trust",
    desc: "Maternal mortality in Marsabit remains critically high due to distance from health facilities. This campaign equips and operates a mobile clinic that visits 18 remote villages monthly, providing antenatal care, safe delivery kits, postnatal follow-ups, and emergency referrals.",
    short: "A mobile clinic serving 18 remote villages in Marsabit with antenatal care and emergency maternal health services.",
    raised: 520000,
    target: 700000,
    donors: 489,
    verified: true,
    impact: [
      { num: "18", lbl: "Villages Covered" },
      { num: "640", lbl: "Mothers Reached" },
      { num: "34", lbl: "Safe Deliveries" }
    ],
    usage: "55% on medical supplies and equipment, 30% on fuel and vehicle maintenance, 10% on healthcare worker salaries, 5% on administration.",
    color: "#fdf2f8"
  },
  {
    id: 4,
    icon: "🌱",
    category: "Livelihood",
    title: "Youth Agri-Business Incubator — Nakuru",
    org: "Vijana Farms Kenya",
    desc: "Unemployed youth in Nakuru are trained in modern farming techniques, agri-business planning, and market linkages. Each cohort of 30 graduates receives a startup input grant to launch small-scale commercial farms producing vegetables and poultry for Nairobi markets.",
    short: "Training and funding 30 unemployed youth per cohort to launch agri-businesses in Nakuru County.",
    raised: 160000,
    target: 350000,
    donors: 97,
    verified: true,
    impact: [
      { num: "60", lbl: "Youth Trained" },
      { num: "2", lbl: "Cohorts Complete" },
      { num: "KES 20K", lbl: "Avg Startup Grant" }
    ],
    usage: "40% startup input grants, 35% training and facilitation, 15% market linkage support, 10% program management.",
    color: "#eafaf1"
  },
  {
    id: 5,
    icon: "🆘",
    category: "Emergency",
    title: "El Niño Flood Relief — Tana River",
    org: "Kenya Disaster Response Network",
    desc: "Severe flooding along the Tana River has displaced over 4,000 families. This emergency campaign delivers food parcels, temporary shelter, clean water, and hygiene kits to affected households while recovery plans are put in place with county government partners.",
    short: "Emergency relief — food, shelter, and clean water — for 4,000+ flood-displaced families along Tana River.",
    raised: 890000,
    target: 1000000,
    donors: 762,
    verified: true,
    impact: [
      { num: "4,200", lbl: "Families Reached" },
      { num: "8,400", lbl: "Food Parcels" },
      { num: "210", lbl: "Shelter Kits" }
    ],
    usage: "70% food and non-food items, 15% logistics and transport, 10% water purification, 5% coordination.",
    color: "#fef5e7"
  },
  {
    id: 6,
    icon: "🌳",
    category: "Environment",
    title: "Reforesting the Aberdare Range",
    org: "Msitu wa Kenya",
    desc: "The Aberdare catchment feeds eight major rivers supplying Nairobi with water. Decades of encroachment have degraded 30,000 hectares. This campaign plants indigenous tree species, partners with local communities for stewardship, and monitors forest recovery through satellite imaging.",
    short: "Planting indigenous trees across degraded Aberdare highland zones and training local communities as forest stewards.",
    raised: 295000,
    target: 500000,
    donors: 418,
    verified: true,
    impact: [
      { num: "45,000", lbl: "Trees Planted" },
      { num: "120ha", lbl: "Area Restored" },
      { num: "80", lbl: "Community Rangers" }
    ],
    usage: "50% seedling nurseries and planting, 25% community ranger program, 15% monitoring technology, 10% education and outreach.",
    color: "#e8f8f5"
  }
];

const dbConfig = {
  host: process.env.DB_HOST || "127.0.0.1",
  port: Number(process.env.DB_PORT) || 3306,
  user: process.env.DB_USER || "root",
  password: process.env.DB_PASSWORD || "",
  database: process.env.DB_NAME || "charitylink"
};

let pool: mysql.Pool | null = null;
let isUsingMySQL = false;

async function createTables() {
  if (!pool) return;
  // Create campaigns table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS campaigns (
      id INT AUTO_INCREMENT PRIMARY KEY,
      icon VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      title VARCHAR(255) NOT NULL,
      org VARCHAR(255) NOT NULL,
      \`desc\` TEXT NOT NULL,
      short TEXT NOT NULL,
      raised INT DEFAULT 0,
      target INT NOT NULL,
      donors INT DEFAULT 0,
      verified TINYINT(1) DEFAULT 1,
      impact TEXT NOT NULL,
      \`usage\` TEXT NOT NULL,
      color VARCHAR(255) NOT NULL,
      ownerEmail VARCHAR(255)
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create users table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS users (
      email VARCHAR(255) PRIMARY KEY,
      name VARCHAR(255) NOT NULL,
      password VARCHAR(255),
      role VARCHAR(255) DEFAULT 'donor',
      photoUrl TEXT,
      memberSince VARCHAR(255) DEFAULT 'June 2026',
      totalContributed INT DEFAULT 0,
      campaignsSupported INT DEFAULT 0
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Create contributions table
  await pool.query(`
    CREATE TABLE IF NOT EXISTS contributions (
      id VARCHAR(255) PRIMARY KEY,
      campaignId INT NOT NULL,
      campaignTitle VARCHAR(255) NOT NULL,
      category VARCHAR(255) NOT NULL,
      donorName VARCHAR(255) NOT NULL,
      donorEmail VARCHAR(255) NOT NULL,
      amount INT NOT NULL,
      timestamp VARCHAR(255) NOT NULL,
      paymentMethod VARCHAR(255) NOT NULL
    ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
  `);

  // Seed initial campaigns if campaigns table is empty
  const [rows]: any = await pool.query("SELECT COUNT(*) as count FROM campaigns");
  if (rows[0].count === 0) {
    console.log("Seeding initial campaigns into MySQL database...");
    for (const c of INITIAL_CAMPAIGNS) {
      await pool.query(
        "INSERT INTO campaigns (id, icon, category, title, org, `desc`, short, raised, target, donors, verified, impact, `usage`, color) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          c.id,
          c.icon,
          c.category,
          c.title,
          c.org,
          c.desc,
          c.short,
          c.raised,
          c.target,
          c.donors,
          c.verified ? 1 : 0,
          JSON.stringify(c.impact),
          c.usage,
          c.color
        ]
      );
    }
  }
}

async function initMySQL() {
  if (!process.env.DB_HOST && !process.env.DB_NAME) {
    console.log("No MySQL environment variables set in .env. Falling back to local data-store.json...");
    return;
  }
  try {
    const adminConnection = await mysql.createConnection({
      host: dbConfig.host,
      port: dbConfig.port,
      user: dbConfig.user,
      password: dbConfig.password,
    });
    await adminConnection.query(`CREATE DATABASE IF NOT EXISTS \`${dbConfig.database}\``);
    await adminConnection.end();

    pool = mysql.createPool(dbConfig);
    const connection = await pool.getConnection();
    console.log("Successfully connected to MySQL database on " + dbConfig.host);
    connection.release();

    await createTables();
    isUsingMySQL = true;
    console.log("MySQL Engine initialized successfully.");
  } catch (err: any) {
    console.warn("⚠️ MySQL Database is not responsive. Details: " + err.message);
    console.warn("CharityLink will fall back seamlessly to local database (data-store.json).");
    pool = null;
    isUsingMySQL = false;
  }
}

function loadDB(): DatabaseSchema {
  try {
    if (fs.existsSync(DATA_STORE_PATH)) {
      const raw = fs.readFileSync(DATA_STORE_PATH, "utf-8");
      return JSON.parse(raw);
    }
  } catch (err) {
    console.error("Error reading database store, recreating empty:", err);
  }

  const initialDB: DatabaseSchema = {
    campaigns: INITIAL_CAMPAIGNS,
    users: [],
    contributions: []
  };
  fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(initialDB, null, 2), "utf-8");
  return initialDB;
}

function saveDB(db: DatabaseSchema) {
  try {
    fs.writeFileSync(DATA_STORE_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (err) {
    console.error("Error writing to database store:", err);
  }
}

// Looks up a single user by email across whichever store is active.
async function getUserByEmail(email: string): Promise<UserRecord | null> {
  const normalized = email.trim().toLowerCase();
  try {
    if (isUsingMySQL && pool) {
      const [rows]: any = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [normalized]);
      return rows[0] || null;
    }
  } catch (err) {
    console.error("getUserByEmail error:", err);
  }
  const db = loadDB();
  return db.users.find(u => u.email.toLowerCase() === normalized) || null;
}

// Resolves the acting user for a protected request. The requester is identified
// by email (query, body, or header) and the authoritative role is read back
// from the database — we never trust a role claimed by the client.
async function resolveRequester(req: any): Promise<UserRecord | null> {
  const email = (req.query?.requesterEmail || req.body?.requesterEmail || req.headers["x-user-email"]) as string | undefined;
  if (!email) return null;
  return getUserByEmail(String(email));
}

// Returns a full read snapshot of the active store (MySQL or JSON), used by the
// public analytics / activity / leaderboard endpoints.
async function snapshot(): Promise<DatabaseSchema> {
  try {
    if (isUsingMySQL && pool) {
      const [c]: any = await pool.query("SELECT * FROM campaigns");
      const campaigns = c.map((row: any) => ({
        ...row,
        verified: Boolean(row.verified),
        impact: JSON.parse(row.impact)
      }));
      const [u]: any = await pool.query("SELECT * FROM users");
      const [ct]: any = await pool.query("SELECT * FROM contributions");
      return { campaigns, users: u, contributions: ct };
    }
  } catch (err) {
    console.error("snapshot error:", err);
  }
  return loadDB();
}

// Donor giving tiers, shared so the API and UI agree on thresholds.
const GIVING_TIERS = [
  { name: "Seedling", min: 0, icon: "🌱" },
  { name: "Bronze Guardian", min: 5000, icon: "🥉" },
  { name: "Silver Guardian", min: 25000, icon: "🥈" },
  { name: "Gold Guardian", min: 75000, icon: "🥇" },
  { name: "Platinum Guardian", min: 200000, icon: "💎" }
];

function tierFor(total: number) {
  let current = GIVING_TIERS[0];
  for (const t of GIVING_TIERS) if (total >= t.min) current = t;
  const idx = GIVING_TIERS.indexOf(current);
  const next = GIVING_TIERS[idx + 1] || null;
  return { current, next };
}

// --- AI (Gemini) with graceful local fallback ---
// Calls Gemini when GEMINI_API_KEY is configured; returns null otherwise so
// callers can fall back to a deterministic local generator (keeps the demo
// working with no API key).
async function callGemini(prompt: string): Promise<string | null> {
  const key = process.env.GEMINI_API_KEY;
  if (!key || key === "MY_GEMINI_API_KEY") return null;
  try {
    const { GoogleGenAI } = await import("@google/genai");
    const ai = new GoogleGenAI({ apiKey: key });
    const resp: any = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt
    });
    return resp?.text ?? null;
  } catch (err) {
    console.error("Gemini call failed, using fallback:", err);
    return null;
  }
}

function localCampaignCopy(idea: string, category: string, org: string) {
  const cleanIdea = idea.trim().replace(/\.$/, "");
  const orgName = org || "Our organisation";
  const cat = (category || "community").toLowerCase();
  const short = `${cleanIdea} — a verified ${cat} initiative mobilising transparent support for communities across Kenya.`;
  const desc =
    `${orgName} is launching this ${cat} campaign to address a pressing local need: ${cleanIdea}. ` +
    `Every shilling contributed is tracked in real time and disbursed in verified increments, so donors can see exactly how their support translates into on-the-ground impact. ` +
    `Working alongside county partners and independent field volunteers, we register coordinates, document delivery, and publish progress openly. ` +
    `Your contribution helps us reach more households, accelerate implementation, and build lasting change grounded in accountability and trust.`;
  const usage = "85% goes directly to field implementation and materials, 10% to verified logistics and monitoring, and 5% to community coordination and transparent reporting.";
  return { short, desc, usage, source: "template" as const };
}

function localImpact(amount: number, campaignTitle: string, category: string) {
  const cat = (category || "").toLowerCase();
  const perUnit: Record<string, { unit: string; cost: number }> = {
    water: { unit: "a day of clean water for pupils", cost: 100 },
    education: { unit: "a week of tuition support", cost: 500 },
    health: { unit: "a maternal check-up", cost: 800 },
    livelihood: { unit: "a day of agri-business training", cost: 600 },
    emergency: { unit: "an emergency food parcel", cost: 1000 },
    environment: { unit: "indigenous tree seedlings planted", cost: 50 }
  };
  const spec = perUnit[cat] || { unit: "units of verified support", cost: 300 };
  const units = Math.max(1, Math.round(amount / spec.cost));
  const text = `Your KES ${amount.toLocaleString()} to “${campaignTitle}” provides roughly ${units.toLocaleString()} ${spec.unit} — a direct, verified contribution to lasting local impact.`;
  return { text, source: "template" as const };
}

// Shared donation-recording logic used by both the direct /donate endpoint
// and the M-Pesa STK callback, so campaign/contribution/user updates only
// live in one place. Behavior is identical to the previous inline copies.
async function recordDonation(params: {
  campaignId: number;
  donationVal: number;
  donorEmail?: string;
  donorName?: string;
  paymentMethod: string;
}): Promise<{ campaign: any; contribution: any } | null> {
  const { campaignId, donationVal, paymentMethod } = params;
  const resolvedEmail = params.donorEmail ? params.donorEmail.trim().toLowerCase() : "anonymous@charitylink.org";
  const resolvedName = params.donorName || "Anonymous Steward";

  try {
    if (isUsingMySQL && pool) {
      const [campaigns]: any = await pool.query("SELECT * FROM campaigns WHERE id = ?", [campaignId]);
      if (!campaigns?.[0]) return null;
      const campaign = campaigns[0];

      const newRaised = campaign.raised + donationVal;
      const newDonors = campaign.donors + 1;
      const percentage = Math.round((newRaised / campaign.target) * 100);
      const impactObj = [
        { num: `${percentage}%`, lbl: "Target completed" },
        { num: `KES ${Math.round(newRaised / newDonors).toLocaleString()}`, lbl: "Avg contribution" },
        { num: `${newDonors}`, lbl: "Steward handshakes" }
      ];

      await pool.query(
        "UPDATE campaigns SET raised = ?, donors = ?, impact = ? WHERE id = ?",
        [newRaised, newDonors, JSON.stringify(impactObj), campaignId]
      );

      const contributionId = `donation_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      await pool.query(
        "INSERT INTO contributions (id, campaignId, campaignTitle, category, donorName, donorEmail, amount, timestamp, paymentMethod) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
        [
          contributionId,
          campaignId,
          campaign.title,
          campaign.category,
          resolvedName,
          resolvedEmail,
          donationVal,
          new Date().toISOString(),
          paymentMethod
        ]
      );

      if (params.donorEmail) {
        await pool.query(
          "UPDATE users SET totalContributed = totalContributed + ?, campaignsSupported = campaignsSupported + 1 WHERE LOWER(email) = ?",
          [donationVal, resolvedEmail]
        );
      }

      const [updatedCampaignRows]: any = await pool.query("SELECT * FROM campaigns WHERE id = ?", [campaignId]);
      const updatedCampaign = updatedCampaignRows[0];
      updatedCampaign.verified = Boolean(updatedCampaign.verified);
      updatedCampaign.impact = JSON.parse(updatedCampaign.impact);

      const contribution = {
        id: contributionId,
        campaignId,
        campaignTitle: campaign.title,
        category: campaign.category,
        donorName: resolvedName,
        donorEmail: resolvedEmail,
        amount: donationVal,
        timestamp: new Date().toISOString(),
        paymentMethod
      };

      return { campaign: updatedCampaign, contribution };
    }
  } catch (err) {
    console.error("MySQL update error in recordDonation:", err);
  }

  const db = loadDB();
  const campaignIndex = db.campaigns.findIndex(c => c.id === campaignId);
  if (campaignIndex === -1) return null;

  db.campaigns[campaignIndex].raised += donationVal;
  db.campaigns[campaignIndex].donors += 1;

  const percentage = Math.round((db.campaigns[campaignIndex].raised / db.campaigns[campaignIndex].target) * 100);
  db.campaigns[campaignIndex].impact = [
    { num: `${percentage}%`, lbl: "Target completed" },
    { num: `KES ${Math.round(db.campaigns[campaignIndex].raised / db.campaigns[campaignIndex].donors).toLocaleString()}`, lbl: "Avg contribution" },
    { num: `${db.campaigns[campaignIndex].donors}`, lbl: "Steward handshakes" }
  ];

  const newContribution: Contribution = {
    id: `donation_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
    campaignId,
    campaignTitle: db.campaigns[campaignIndex].title,
    category: db.campaigns[campaignIndex].category,
    donorName: resolvedName,
    donorEmail: resolvedEmail,
    amount: donationVal,
    timestamp: new Date().toISOString(),
    paymentMethod
  };
  db.contributions.push(newContribution);

  if (params.donorEmail) {
    const userIndex = db.users.findIndex(u => u.email.toLowerCase() === resolvedEmail);
    if (userIndex !== -1) {
      db.users[userIndex].totalContributed += donationVal;
      db.users[userIndex].campaignsSupported += 1;
    }
  }

  saveDB(db);
  return { campaign: db.campaigns[campaignIndex], contribution: newContribution };
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // CRITICAL REQUIREMENT: Parse JSON request bodies of up to 65 megabytes
  app.use(express.json({ limit: "65mb" }));
  app.use(express.urlencoded({ limit: "65mb", extended: true }));

  // Initialize MySQL database (falls back to local JSON store if MySQL is not setup/running)
  await initMySQL();

  // Initialize loadDB fallback
  loadDB();


  // --- API ROUTE HANDLERS ---

  // Health check endpoint
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok", mode: process.env.NODE_ENV || "development", usingMySQL: isUsingMySQL });
  });

  // Get campaigns list
  app.get("/api/campaigns", async (req, res) => {
    try {
      if (isUsingMySQL && pool) {
        const [rows]: any = await pool.query("SELECT * FROM campaigns");
        const parsedCampaigns = rows.map((row: any) => ({
          ...row,
          verified: Boolean(row.verified),
          impact: JSON.parse(row.impact)
        }));
        return res.json(parsedCampaigns);
      }
    } catch (err) {
      console.error("MySQL query error in /api/campaigns:", err);
    }

    const db = loadDB();
    res.json(db.campaigns);
  });

  // Create a new campaign
  app.post("/api/campaigns", async (req, res) => {
    const { title, org, desc, short, target, category, icon, color, ownerEmail } = req.body;
    if (!title || !org || !desc || !short || !target || !category || !icon) {
      return res.status(400).json({ error: "Missing required fields to initialize a campaign." });
    }

    // Only verified organisations and admins may launch campaigns.
    const creator = await resolveRequester(req);
    if (!creator || (creator.role !== "organisation" && creator.role !== "admin")) {
      return res.status(403).json({ error: "Only organisation or admin accounts can launch campaigns." });
    }
    const resolvedOwner = (ownerEmail || creator.email || "").toString().trim().toLowerCase();

    const impactObj = [
      { num: "0%", lbl: "Target achieved" },
      { num: "KES 0", lbl: "Avg contribution" }
    ];
    const usageText = "90% is allocated straight to direct logistical implementation and 10% covers local community stewardship operations.";

    try {
      if (isUsingMySQL && pool) {
        const [result]: any = await pool.query(
          "INSERT INTO campaigns (icon, category, title, org, `desc`, short, raised, target, donors, verified, impact, `usage`, color, ownerEmail) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)",
          [
            icon,
            category,
            title,
            org,
            desc,
            short,
            0,
            Number(target),
            0,
            1,
            JSON.stringify(impactObj),
            usageText,
            color || "#eafaf1",
            resolvedOwner
          ]
        );
        const newCampaign = {
          id: result.insertId,
          icon,
          category,
          title,
          org,
          desc,
          short,
          raised: 0,
          target: Number(target),
          donors: 0,
          verified: true,
          impact: impactObj,
          usage: usageText,
          color: color || "#eafaf1",
          ownerEmail: resolvedOwner
        };
        return res.status(201).json(newCampaign);
      }
    } catch (err) {
      console.error("MySQL write error in /api/campaigns:", err);
    }

    const db = loadDB();
    const newId = (db.campaigns.length > 0) ? Math.max(...db.campaigns.map(c => c.id)) + 1 : 1;
    const newCampaign: CampaignRecord = {
      id: newId,
      icon,
      category,
      title,
      org,
      desc,
      short,
      raised: 0,
      target: Number(target),
      donors: 0,
      verified: true,
      impact: impactObj,
      usage: usageText,
      color: color || "#eafaf1",
      ownerEmail: resolvedOwner
    };

    db.campaigns.push(newCampaign);
    saveDB(db);
    res.status(201).json(newCampaign);
  });

  // Delete a campaign. Admins may delete any campaign; organisations may delete
  // only campaigns they own. The acting user's role is verified server-side.
  app.delete("/api/campaigns/:id", async (req, res) => {
    const campaignId = Number(req.params.id);
    const requester = await resolveRequester(req);
    if (!requester) {
      return res.status(401).json({ error: "You must be logged in to delete a campaign." });
    }

    const isOwnerOf = (owner?: string) =>
      !!owner && owner.toLowerCase() === requester.email.toLowerCase();

    try {
      if (isUsingMySQL && pool) {
        const [rows]: any = await pool.query("SELECT * FROM campaigns WHERE id = ?", [campaignId]);
        const campaign = rows?.[0];
        if (!campaign) return res.status(404).json({ error: "Campaign not found." });

        if (requester.role !== "admin" && !(requester.role === "organisation" && isOwnerOf(campaign.ownerEmail))) {
          return res.status(403).json({ error: "You do not have permission to delete this campaign." });
        }

        await pool.query("DELETE FROM contributions WHERE campaignId = ?", [campaignId]);
        await pool.query("DELETE FROM campaigns WHERE id = ?", [campaignId]);
        return res.json({ success: true, id: campaignId });
      }
    } catch (err) {
      console.error("MySQL delete error in /api/campaigns/:id:", err);
    }

    const db = loadDB();
    const campaign = db.campaigns.find(c => c.id === campaignId);
    if (!campaign) return res.status(404).json({ error: "Campaign not found." });

    if (requester.role !== "admin" && !(requester.role === "organisation" && isOwnerOf(campaign.ownerEmail))) {
      return res.status(403).json({ error: "You do not have permission to delete this campaign." });
    }

    db.campaigns = db.campaigns.filter(c => c.id !== campaignId);
    db.contributions = db.contributions.filter(c => c.campaignId !== campaignId);
    saveDB(db);
    res.json({ success: true, id: campaignId });
  });

  // Edit a campaign (admin: any; organisation: only its own).
  app.put("/api/campaigns/:id", async (req, res) => {
    const campaignId = Number(req.params.id);
    const requester = await resolveRequester(req);
    if (!requester) {
      return res.status(401).json({ error: "You must be logged in to edit a campaign." });
    }

    const { title, org, desc, short, target, category, icon, color } = req.body;
    const isOwnerOf = (owner?: string) => !!owner && owner.toLowerCase() === requester.email.toLowerCase();

    const authorize = (owner?: string) =>
      requester.role === "admin" || (requester.role === "organisation" && isOwnerOf(owner));

    try {
      if (isUsingMySQL && pool) {
        const [rows]: any = await pool.query("SELECT * FROM campaigns WHERE id = ?", [campaignId]);
        const existing = rows?.[0];
        if (!existing) return res.status(404).json({ error: "Campaign not found." });
        if (!authorize(existing.ownerEmail)) return res.status(403).json({ error: "You do not have permission to edit this campaign." });

        await pool.query(
          "UPDATE campaigns SET title = ?, org = ?, `desc` = ?, short = ?, target = ?, category = ?, icon = ?, color = ? WHERE id = ?",
          [
            title ?? existing.title,
            org ?? existing.org,
            desc ?? existing.desc,
            short ?? existing.short,
            target ? Number(target) : existing.target,
            category ?? existing.category,
            icon ?? existing.icon,
            color ?? existing.color,
            campaignId
          ]
        );
        const [updatedRows]: any = await pool.query("SELECT * FROM campaigns WHERE id = ?", [campaignId]);
        const updated = updatedRows[0];
        updated.verified = Boolean(updated.verified);
        updated.impact = JSON.parse(updated.impact);
        return res.json(updated);
      }
    } catch (err) {
      console.error("MySQL update error in PUT /api/campaigns/:id:", err);
    }

    const db = loadDB();
    const idx = db.campaigns.findIndex(c => c.id === campaignId);
    if (idx === -1) return res.status(404).json({ error: "Campaign not found." });
    if (!authorize(db.campaigns[idx].ownerEmail)) return res.status(403).json({ error: "You do not have permission to edit this campaign." });

    db.campaigns[idx] = {
      ...db.campaigns[idx],
      title: title ?? db.campaigns[idx].title,
      org: org ?? db.campaigns[idx].org,
      desc: desc ?? db.campaigns[idx].desc,
      short: short ?? db.campaigns[idx].short,
      target: target ? Number(target) : db.campaigns[idx].target,
      category: category ?? db.campaigns[idx].category,
      icon: icon ?? db.campaigns[idx].icon,
      color: color ?? db.campaigns[idx].color
    };
    saveDB(db);
    res.json(db.campaigns[idx]);
  });

  // Log in user
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ error: "Email and password are required." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (isUsingMySQL && pool) {
        const [users]: any = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [normalizedEmail]);
        if (users.length === 0) {
          return res.status(404).json({ error: "No account found with that email. Please create an account first." });
        }
        const user = users[0];

        if (user.password) {
          if (!verifyPassword(password, user.password)) {
            return res.status(401).json({ error: "Incorrect password. Please try again." });
          }
        } else {
          // Legacy account created before password hashing existed: set the
          // password on this first successful login so the account is secured.
          await pool.query("UPDATE users SET password = ? WHERE LOWER(email) = ?", [hashPassword(password), normalizedEmail]);
        }
        return res.json({ user: sanitizeUser(user) });
      }
    } catch (err) {
      console.error("MySQL lookup error in /api/auth/login:", err);
    }

    const db = loadDB();
    const userIndex = db.users.findIndex(u => u.email.toLowerCase() === normalizedEmail);

    if (userIndex === -1) {
      return res.status(404).json({ error: "No account found with that email. Please create an account first." });
    }

    const user = db.users[userIndex];
    if (user.password) {
      if (!verifyPassword(password, user.password)) {
        return res.status(401).json({ error: "Incorrect password. Please try again." });
      }
    } else {
      // Legacy account: secure it by storing the hash of the password used now.
      db.users[userIndex].password = hashPassword(password);
      saveDB(db);
    }

    res.json({ user: sanitizeUser(db.users[userIndex]) });
  });

  // Register user
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, role, photoUrl, adminCode } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ error: "Missing required fields for account registration." });
    }
    if (String(password).length < 8) {
      return res.status(400).json({ error: "Password must be at least 8 characters." });
    }

    const requestedRole = (role || "donor").toString();
    const allowedRoles = ["donor", "organisation", "admin"];
    if (!allowedRoles.includes(requestedRole)) {
      return res.status(400).json({ error: "Invalid account role selected." });
    }
    // Admin accounts require the shared admin access code so users cannot
    // grant themselves elevated privileges through the public form.
    if (requestedRole === "admin" && adminCode !== ADMIN_ACCESS_CODE) {
      return res.status(403).json({ error: "Invalid admin access code. Administrator registration denied." });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const passwordHash = hashPassword(password);

    try {
      if (isUsingMySQL && pool) {
        const [existing]: any = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [normalizedEmail]);
        if (existing.length > 0) {
          return res.status(400).json({ error: "An account is already registered with this email address." });
        }

        await pool.query(
          "INSERT INTO users (email, name, password, role, photoUrl, memberSince, totalContributed, campaignsSupported) VALUES (?, ?, ?, ?, ?, ?, ?, ?)",
          [normalizedEmail, name, passwordHash, requestedRole, photoUrl || "", "June 2026", 0, 0]
        );

        const newUser = {
          name,
          email: normalizedEmail,
          role: requestedRole,
          photoUrl: photoUrl || "",
          memberSince: "June 2026",
          totalContributed: 0,
          campaignsSupported: 0
        };
        return res.status(201).json({ user: newUser });
      }
    } catch (err) {
      console.error("MySQL write error in /api/auth/register:", err);
    }

    const db = loadDB();
    const userExists = db.users.some(u => u.email.toLowerCase() === normalizedEmail);

    if (userExists) {
      return res.status(400).json({ error: "An account is already registered with this email address." });
    }

    const newUser: UserRecord = {
      name,
      email: normalizedEmail,
      password: passwordHash,
      role: requestedRole,
      photoUrl: photoUrl || "",
      memberSince: "June 2026",
      totalContributed: 0,
      campaignsSupported: 0
    };

    db.users.push(newUser);
    saveDB(db);
    res.status(201).json({ user: sanitizeUser(newUser) });
  });

  // Update photo endpoint
  app.post("/api/auth/update-photo", async (req, res) => {
    const { email, photoUrl } = req.body;
    if (!email) {
      return res.status(400).json({ error: "Email reference is required to update photo." });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
      if (isUsingMySQL && pool) {
        const [users]: any = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [normalizedEmail]);
        if (users.length === 0) {
          return res.status(404).json({ error: "User reference not found in registered database." });
        }
        await pool.query("UPDATE users SET photoUrl = ? WHERE LOWER(email) = ?", [photoUrl || "", normalizedEmail]);
        const [updated]: any = await pool.query("SELECT * FROM users WHERE LOWER(email) = ?", [normalizedEmail]);
        return res.json({ success: true, user: sanitizeUser(updated[0]) });
      }
    } catch (err) {
      console.error("MySQL update error in /api/auth/update-photo:", err);
    }

    const db = loadDB();
    const userIndex = db.users.findIndex(u => u.email.toLowerCase() === normalizedEmail);

    if (userIndex === -1) {
      return res.status(404).json({ error: "User reference not found in registered database." });
    }

    db.users[userIndex].photoUrl = photoUrl || "";
    saveDB(db);
    res.json({ success: true, user: sanitizeUser(db.users[userIndex]) });
  });

  // --- ADMIN ENDPOINTS (role-gated) ---
  // Platform-wide views available only to administrators.
  app.get("/api/admin/users", async (req, res) => {
    const requester = await resolveRequester(req);
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ error: "Administrator access required." });
    }
    try {
      if (isUsingMySQL && pool) {
        const [rows]: any = await pool.query("SELECT * FROM users");
        return res.json(rows.map((u: any) => sanitizeUser(u)));
      }
    } catch (err) {
      console.error("MySQL query error in /api/admin/users:", err);
    }
    const db = loadDB();
    res.json(db.users.map(u => sanitizeUser(u)));
  });

  app.get("/api/admin/contributions", async (req, res) => {
    const requester = await resolveRequester(req);
    if (!requester || requester.role !== "admin") {
      return res.status(403).json({ error: "Administrator access required." });
    }
    try {
      if (isUsingMySQL && pool) {
        const [rows]: any = await pool.query("SELECT * FROM contributions ORDER BY timestamp DESC");
        return res.json(rows);
      }
    } catch (err) {
      console.error("MySQL query error in /api/admin/contributions:", err);
    }
    const db = loadDB();
    res.json([...db.contributions].reverse());
  });

  // --- PUBLIC ANALYTICS (aggregated, no personal data) ---
  app.get("/api/analytics", async (req, res) => {
    const { campaigns, contributions, users } = await snapshot();

    const totalRaised = campaigns.reduce((s, c) => s + (c.raised || 0), 0);
    const totalDonors = campaigns.reduce((s, c) => s + (c.donors || 0), 0);

    // Funds raised per category (from campaign totals).
    const byCategoryMap: Record<string, number> = {};
    for (const c of campaigns) byCategoryMap[c.category] = (byCategoryMap[c.category] || 0) + (c.raised || 0);
    const byCategory = Object.entries(byCategoryMap).map(([label, value]) => ({ label, value }));

    // Top campaigns by amount raised.
    const topCampaigns = [...campaigns]
      .sort((a, b) => b.raised - a.raised)
      .slice(0, 6)
      .map(c => ({ title: c.title, raised: c.raised, target: c.target, icon: c.icon, color: c.color }));

    // Donations over time (grouped by calendar day).
    const byDayMap: Record<string, number> = {};
    for (const ct of contributions) {
      const day = (ct.timestamp || "").slice(0, 10);
      if (!day) continue;
      byDayMap[day] = (byDayMap[day] || 0) + (ct.amount || 0);
    }
    const overTime = Object.entries(byDayMap)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([date, amount]) => ({ date, amount }));

    // Payment-method split.
    const byMethodMap: Record<string, number> = {};
    for (const ct of contributions) byMethodMap[ct.paymentMethod || "Other"] = (byMethodMap[ct.paymentMethod || "Other"] || 0) + 1;
    const byMethod = Object.entries(byMethodMap).map(([label, value]) => ({ label, value }));

    res.json({
      totals: {
        raised: totalRaised,
        donors: totalDonors,
        campaigns: campaigns.length,
        contributions: contributions.length,
        users: users.length,
        verifiedPct: campaigns.length ? Math.round((campaigns.filter(c => c.verified).length / campaigns.length) * 100) : 100
      },
      byCategory,
      topCampaigns,
      overTime,
      byMethod
    });
  });

  // --- LIVE ACTIVITY FEED (recent contributions, first names only) ---
  app.get("/api/activity", async (req, res) => {
    const limit = Math.min(Number(req.query.limit) || 15, 50);
    const { contributions } = await snapshot();
    const recent = [...contributions]
      .sort((a, b) => (b.timestamp || "").localeCompare(a.timestamp || ""))
      .slice(0, limit)
      .map(c => ({
        donorName: (c.donorName || "Anonymous").split(" ")[0],
        amount: c.amount,
        campaignTitle: c.campaignTitle,
        category: c.category,
        paymentMethod: c.paymentMethod,
        timestamp: c.timestamp
      }));
    res.json(recent);
  });

  // --- TOP DONORS LEADERBOARD ---
  app.get("/api/leaderboard", async (req, res) => {
    const { users } = await snapshot();
    const top = [...users]
      .filter(u => (u.totalContributed || 0) > 0)
      .sort((a, b) => (b.totalContributed || 0) - (a.totalContributed || 0))
      .slice(0, 10)
      .map(u => ({
        name: u.name,
        photoUrl: u.photoUrl || "",
        totalContributed: u.totalContributed || 0,
        campaignsSupported: u.campaignsSupported || 0,
        tier: tierFor(u.totalContributed || 0).current
      }));
    res.json(top);
  });

  // --- AI: CAMPAIGN COPYWRITER ---
  // Turns a one-line idea into a full description, short pitch and fund-usage
  // breakdown. Uses Gemini if configured, else a deterministic local generator.
  app.post("/api/ai/campaign-copy", async (req, res) => {
    const { idea, category, org } = req.body as { idea?: string; category?: string; org?: string };
    if (!idea || !idea.trim()) {
      return res.status(400).json({ error: "Please provide a short idea for your campaign." });
    }

    const prompt =
      `You are a fundraising copywriter for a Kenyan charity platform called CharityLink. ` +
      `Given this campaign idea: "${idea}" (category: ${category || "community"}, organisation: ${org || "an NGO"}), ` +
      `write compelling, credible copy. Respond ONLY with strict minified JSON with exactly these keys: ` +
      `"short" (one punchy sentence, max 160 chars), "desc" (2-3 vivid paragraphs, ~120 words), ` +
      `"usage" (one sentence describing the percentage fund allocation). No markdown, no extra text.`;

    const raw = await callGemini(prompt);
    if (raw) {
      try {
        const jsonText = raw.replace(/```json/gi, "").replace(/```/g, "").trim();
        const parsed = JSON.parse(jsonText);
        if (parsed.short && parsed.desc && parsed.usage) {
          return res.json({ short: parsed.short, desc: parsed.desc, usage: parsed.usage, source: "ai" });
        }
      } catch {
        // fall through to local generator
      }
    }
    res.json(localCampaignCopy(idea, category || "", org || ""));
  });

  // --- AI: DONATION IMPACT EXPLAINER ---
  app.post("/api/ai/impact", async (req, res) => {
    const { amount, campaignTitle, category } = req.body as { amount?: number; campaignTitle?: string; category?: string };
    const amt = Number(amount);
    if (!amt || amt <= 0 || !campaignTitle) {
      return res.status(400).json({ error: "amount and campaignTitle are required." });
    }

    const prompt =
      `In ONE encouraging sentence (max 30 words, no markdown), tell a donor the tangible impact of giving ` +
      `KES ${amt} to the Kenyan charity campaign "${campaignTitle}" (category: ${category || "community"}). ` +
      `Be concrete and realistic.`;

    const raw = await callGemini(prompt);
    if (raw && raw.trim()) {
      return res.json({ text: raw.trim().replace(/^["']|["']$/g, ""), source: "ai" });
    }
    res.json(localImpact(amt, campaignTitle, category || ""));
  });

  // Submit donation
  app.post("/api/campaigns/:id/donate", async (req, res) => {
    const campaignId = Number(req.params.id);
    const { amount, donorEmail, paymentMethod, donorName } = req.body;

    if (!amount || isNaN(Number(amount)) || Number(amount) <= 0) {
      return res.status(400).json({ error: "Invalid donation amount." });
    }

    const donationVal = Number(amount);
    const resolvedMethod = paymentMethod || "Secure Mobile Wallet";

    const result = await recordDonation({
      campaignId,
      donationVal,
      donorEmail,
      donorName,
      paymentMethod: resolvedMethod
    });

    if (!result) {
      return res.status(404).json({ error: "Campaign not found." });
    }

    res.json({
      success: true,
      campaign: result.campaign,
      contribution: result.contribution
    });
  });

  // --- M-Pesa STK Push (Sandbox) ---
  // Requires env:
  // MPESA_ENV=sandbox
  // MPESA_CONSUMER_KEY
  // MPESA_CONSUMER_SECRET
  // MPESA_SHORT_CODE
  // MPESA_PASSKEY
  // MPESA_CALLBACK_URL (e.g. http://your-server/api/mpesa/callback)

  const STK_REFERENCE_MAP_PATH = path.join(process.cwd(), "mpesa-reference-map.json");

  type StkRefMap = Record<string, {
    campaignId: number;
    amountKES: number;
    donorEmail?: string;
    donorName?: string;
    createdAt: string;
    status: 'pending' | 'completed' | 'failed';
  }>;

  const loadStkRefMap = (): StkRefMap => {
    try {
      if (fs.existsSync(STK_REFERENCE_MAP_PATH)) {
        return JSON.parse(fs.readFileSync(STK_REFERENCE_MAP_PATH, 'utf-8')) as StkRefMap;
      }
    } catch {
      // ignore
    }
    return {};
  };

  const saveStkRefMap = (m: StkRefMap) => {
    try {
      fs.writeFileSync(STK_REFERENCE_MAP_PATH, JSON.stringify(m, null, 2), 'utf-8');
    } catch {
      // ignore
    }
  };

  // Request STK Push
  app.post('/api/mpesa/stkpush', async (req, res) => {
    try {
      const { campaignId, amountKES, phone, donorEmail, donorName } = req.body as {
        campaignId: number;
        amountKES: number;
        phone: string;
        donorEmail?: string;
        donorName?: string;
      };

      if (!campaignId || !amountKES || !phone) {
        return res.status(400).json({ error: 'campaignId, amountKES, and phone are required' });
      }

      const mpesaEnv = process.env.MPESA_ENV || 'sandbox';
      const consumerKey = process.env.MPESA_CONSUMER_KEY;
      const consumerSecret = process.env.MPESA_CONSUMER_SECRET;
      const shortCode = process.env.MPESA_SHORT_CODE;
      const passkey = process.env.MPESA_PASSKEY;
      const callbackUrl = process.env.MPESA_CALLBACK_URL;

      const credsMissing = !consumerKey || !consumerSecret || !shortCode || !passkey || !callbackUrl;

      // SIMULATION MODE: when real Safaricom Daraja credentials are not
      // configured (or MPESA_SIMULATE=true), we emulate the full STK Push
      // lifecycle locally so the donation flow works end-to-end in a demo.
      // A pending reference is stored, then after a short delay we invoke the
      // same recordDonation() used by the real callback and mark it completed.
      if (credsMissing || process.env.MPESA_SIMULATE === 'true') {
        const reference = `CL_SIM_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
        const checkoutRequestId = `ws_CO_SIM_${Date.now()}`;
        const entry = {
          campaignId: Number(campaignId),
          amountKES: Number(amountKES),
          donorEmail,
          donorName,
          createdAt: new Date().toISOString(),
          status: 'pending' as const
        };
        const simMap = loadStkRefMap();
        simMap[reference] = entry;
        simMap[checkoutRequestId] = { ...entry };
        saveStkRefMap(simMap);

        // Emulate the asynchronous Safaricom callback.
        setTimeout(async () => {
          try {
            const result = await recordDonation({
              campaignId: Number(campaignId),
              donationVal: Number(amountKES),
              donorEmail,
              donorName,
              paymentMethod: 'M-Pesa STK Push'
            });
            const m = loadStkRefMap();
            const finalStatus: 'completed' | 'failed' = result ? 'completed' : 'failed';
            if (m[reference]) m[reference].status = finalStatus;
            if (m[checkoutRequestId]) m[checkoutRequestId].status = finalStatus;
            saveStkRefMap(m);
          } catch (e) {
            console.error('Simulated STK push error:', e);
          }
        }, 4000);

        return res.json({ ok: true, checkoutRequestId, merchantRequestId: `SIM_${Date.now()}`, reference, simulated: true });
      }

      // Safaricom API base for sandbox/production
      const baseUrl = mpesaEnv === 'production'
        ? 'https://api.safaricom.co.ke'
        : 'https://sandbox.safaricom.co.ke';

      const authUrl = `${baseUrl}/oauth/v1/generate?grant_type=client_credentials`;
      const authResponse = await httpJson<any>(authUrl, {
        method: 'GET',
        headers: {
          'Authorization': 'Basic ' + Buffer.from(`${consumerKey}:${consumerSecret}`).toString('base64')
        }
      });

      const accessToken = authResponse.access_token;
      if (!accessToken) {
        return res.status(502).json({ error: 'Failed to obtain Mpesa access token' });
      }

      // Build password
      const timestamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 14);
      const password = Buffer.from(`${shortCode}${passkey}${timestamp}`).toString('base64');

      // Normalize phone to include country code 254 for sandbox
      const phoneDigits = String(phone).trim().replace(/[\s+\-()]/g, '');
      const normalizedPhone = phoneDigits.startsWith('0')
        ? `254${phoneDigits.slice(1)}`
        : phoneDigits.startsWith('254')
          ? phoneDigits
          : phoneDigits.startsWith('7') || phoneDigits.startsWith('1')
            ? `254${phoneDigits}`
            : phoneDigits;

      const reference = `CL_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;

      // Map reference to donation context so callback can record it.
      const refMap = loadStkRefMap();
      refMap[reference] = {
        campaignId: Number(campaignId),
        amountKES: Number(amountKES),
        donorEmail,
        donorName,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };
      saveStkRefMap(refMap);

      const payload = {
        BusinessShortCode: shortCode,
        Password: password,
        Timestamp: timestamp,
        TransactionType: 'CustomerPayBillOnline',
        Amount: String(amountKES),
        PartyA: normalizedPhone,
        PartyB: shortCode,
        PhoneNumber: normalizedPhone,
        CallBackURL: callbackUrl,
        AccountReference: reference,
        TransactionDesc: 'CharityLink Donation'
      };

      const stkPushUrl = `${baseUrl}/mpesa/stkpush/v1/processrequest`;
      const stkResponse = await httpJson<any>(stkPushUrl, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(payload)
      });

      // STK Push returns CheckoutRequestID and MerchantRequestID
      const checkoutRequestId = stkResponse?.CheckoutRequestID;
      if (!checkoutRequestId) {
        // Push failed to initiate; clean up the pending reference entry.
        const cleanupMap = loadStkRefMap();
        delete cleanupMap[reference];
        saveStkRefMap(cleanupMap);
        return res.status(502).json({ error: 'STK push initiation failed', details: stkResponse });
      }

      // CheckoutRequestID is the one identifier Safaricom reliably returns in
      // both this response and the later callback, so re-key the context
      // under it (keeping the original CL_ reference as a fallback lookup).
      const finalMap = loadStkRefMap();
      const ctxEntry = finalMap[reference];
      if (ctxEntry) {
        finalMap[checkoutRequestId] = ctxEntry;
        saveStkRefMap(finalMap);
      }

      return res.json({
        ok: true,
        checkoutRequestId,
        merchantRequestId: stkResponse?.MerchantRequestID,
        reference
      });
    } catch (err: any) {
      console.error('STK Push error:', err?.message || err);
      return res.status(500).json({ error: 'STK push failed' });
    }
  });

  // Callback endpoint
  app.post('/api/mpesa/callback', async (req, res) => {
    try {
      const body = req.body as any;
      const stk = body?.Body?.stkCallback;

      // Return 200 quickly; process after
      res.status(200).json({ received: true });

      const resultCode = stk?.ResultCode;
      const resultDesc = stk?.ResultDesc;
      const callbackMetadata = stk?.CallbackMetadata;
      const checkoutRequestId = stk?.CheckoutRequestID;

      const refMap = loadStkRefMap();
      // CheckoutRequestID is the reliable key (we re-keyed onto it after the
      // push response). Fall back to MerchantRequestID/AccountReference for
      // older entries that only have the original CL_ reference.
      const items: any[] = callbackMetadata?.Item || [];
      const findItem = (name: string) => items.find(i => i.Name === name)?.Value;
      const fallbackRef = findItem('AccountReference') || stk?.MerchantRequestID || '';
      const lookupKey = (checkoutRequestId && refMap[checkoutRequestId]) ? checkoutRequestId : fallbackRef;

      const ctx = lookupKey ? refMap[lookupKey] : undefined;
      if (!ctx) {
        console.warn('Mpesa callback: reference context not found in map');
        return;
      }

      if (resultCode !== 0) {
        console.warn('Mpesa callback failed:', resultDesc);
        ctx.status = 'failed';
        refMap[lookupKey] = ctx;
        saveStkRefMap(refMap);
        return;
      }

      const receivedAmount = Number(findItem('Amount') ?? 0);

      const paymentMethod = 'M-Pesa STK Push';
      const donationVal = Number(ctx.amountKES || receivedAmount);
      const campaignId = Number(ctx.campaignId);

      const result = await recordDonation({
        campaignId,
        donationVal,
        donorEmail: ctx.donorEmail,
        donorName: ctx.donorName,
        paymentMethod
      });

      if (!result) {
        console.warn('Mpesa callback: campaign not found for id', campaignId);
        ctx.status = 'failed';
        refMap[lookupKey] = ctx;
        saveStkRefMap(refMap);
        return;
      }

      // Mark completed rather than deleting, so the polling endpoint can
      // still report success to the frontend after the donation is recorded.
      ctx.status = 'completed';
      refMap[lookupKey] = ctx;
      saveStkRefMap(refMap);
    } catch (err) {
      console.error('Mpesa callback handler error:', err);
    }
  });

  // Poll STK push status (used by the frontend to detect success/failure
  // after initiating a push, since the callback arrives asynchronously).
  app.get('/api/mpesa/status/:checkoutRequestId', async (req, res) => {
    const { checkoutRequestId } = req.params;
    const refMap = loadStkRefMap();
    const ctx = refMap[checkoutRequestId];

    if (!ctx) {
      // Either never existed, or was cleaned up; treat as unknown.
      return res.json({ status: 'unknown' });
    }

    res.json({ status: ctx.status || 'pending' });
  });

  // Get user contributions ledger
  app.get("/api/users/:email/contributions", async (req, res) => {

    const normalizedEmail = req.params.email.trim().toLowerCase();

    try {
      if (isUsingMySQL && pool) {
        const [rows]: any = await pool.query("SELECT * FROM contributions WHERE LOWER(donorEmail) = ?", [normalizedEmail]);
        return res.json(rows);
      }
    } catch (err) {
      console.error("MySQL query error in /api/users/:email/contributions:", err);
    }

    const db = loadDB();
const records = db.contributions.filter((c: Contribution) => c.donorEmail.toLowerCase() === normalizedEmail);
    res.json(records);
  });


  // --- VITE DEV MIDDLEWARE AND CLIENT DISTRIBUTION STATIC ROUTING ---

  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        // The server writes its JSON data files into the project root on every
        // donation/registration. Without this, Vite's file watcher would detect
        // those writes and trigger a full page reload — wiping in-memory React
        // state (e.g. the selected campaign) and blanking the detail view. We
        // ignore the data files so runtime writes never reload the client.
        watch: {
          ignored: ["**/data-store.json", "**/mpesa-reference-map.json"]
        }
      },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`CharityLink server listening securely on port ${PORT}`);
    console.log(`- Local Access: http://localhost:${PORT}`);
    console.log(`- Network Access: http://127.0.0.1:${PORT}`);
  });
}

startServer();
