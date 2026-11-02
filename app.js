require("dotenv").config();
const express = require("express");
const { MongoClient, ObjectId } = require("mongodb");
const bodyParser = require("body-parser");
const session = require("express-session");
const MongoDBStore = require("connect-mongodb-session")(session);
const engine = require("ejs-mate");
const crypto = require("crypto");
const nodemailer = require('nodemailer');
const bcrypt = require('bcryptjs');

const fs = require('fs');
const uploadDir = 'public/uploads';

if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir, { recursive: true });
}


if (!process.env.MONGO_URI) {
    console.error('MONGO_URI is required. Configure MongoDB Atlas in Render Environment.');
    process.exit(1);
}
if (!process.env.SESSION_SECRET || process.env.SESSION_SECRET.length < 32) {
    console.error('SESSION_SECRET must be configured with at least 32 characters.');
    process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 3030;

app.engine("ejs", engine);
app.set("view engine", "ejs");
app.use(express.json());

app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(express.static("public"));
app.use('/uploads', express.static('public/uploads'));


const store = new MongoDBStore({
    uri: process.env.MONGO_URI,
    collection: "sessions"
});

store.on("error", function(error) {
    console.error("Session Store Error:", error);
});

app.set('trust proxy', 1);

app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    store: store,
    cookie: {
        secure: process.env.NODE_ENV === "production",
        httpOnly: true,
        maxAge: 4 * 60 * 60 * 1000
    }
}));

const client = new MongoClient(process.env.MONGO_URI);
let db;

client.connect()
    .then(() => {
        db = client.db();
        console.log("✅ Connected to MongoDB");
    })
    .catch(err => console.error("❌ MongoDB Connection Error:", err));

const isLogin = async (req, res, next) => {
    try {
        if (!req.session.userId) {
            console.log("No session userId found");
            return res.redirect("/");
        }

        let userId = req.session.userId;
        if (typeof userId === "string" && ObjectId.isValid(userId)) {
            userId = new ObjectId(userId);
        }

        const user = await db.collection("user").findOne({ _id: userId });
        if (!user) {
            console.log("User not found for ID:", userId);
            return res.redirect("/");
        }

        if (user.archive === 1 || user.archive === "1" || user.suspend === 1 || user.suspend === "1") {
            console.log("Blocked user tried to access:", user.username);
            req.session.destroy(() => {
                return res.render("lg", { error: "Your account is suspended!" });
            });
            return;
        }

        req.user = user;

        next();

    } catch (err) {
        console.error("Error in isLogin middleware:", err);
        res.status(500).send('<script>alert("Internal Server Error!"); window.location="/";</script>');
    }
};


app.get("/", (req, res) => res.render("index", { error: "", layout: "layout", title: "Home", activePage: "home" }));
app.get("/lg", (req, res) => res.render("lg", { error: "", layout: "layout", title: "Home", activePage: "home" }));
// app.get("/pr", (req, res) => res.render("pr", { error: "", layout: "layout", title: "Home", activePage: "home" }));
app.get("/rg", (req, res) => {
  const message = req.session.message || null;  // get session message
  req.session.message = null; // clear it after displaying once

  res.render("rg", { 
    error: "", 
    layout: "layout", 
    title: "Home", 
    activePage: "home", 
    message 
  });
});

app.get("/forgot", (req, res) => { const error = req.query.error || ""; res.render("forgot", { layout: "forgot", title: "Forgot", activePage: "forgot", error }); });

app.post("/login", async (req, res) => {
    try {
        const { username, password } = req.body;

        const user = await db.collection("user").findOne({
            username: { $regex: new RegExp(`^${username}$`, "i") }
        });

        if (!user) {
            console.log("User not found:", username);
            return res.status(401).json({ error: "Invalid username or password." });
        }

        console.log("User found:", user);

        const hashedPassword = user.password;
        const match = await bcrypt.compare(password, hashedPassword);

        if (!match) {
            console.log("Password mismatch for user:", username);
            return res.status(401).json({ error: "Invalid username or password." });
        }

        if (user.suspend === 1 || user.suspend === "1") {
            console.log("Suspended account attempted login:", username);
            return res.status(403).json({ error: "Account Suspended!" });
        }

        req.session.userId = user._id.toString();
        req.session.access = user.access;

        console.log("Session set:", req.session);

        const redirectPath = user.access === 1 ? "/dsb" : user.access === 0 ? "/hom" : "/";
        return res.json({ message: "Login successful", redirectPath });

    } catch (err) {
        console.error("Login Error:", err.message);
        return res.status(500).json({ error: "An error occurred. Please try again later." });
    }
});

app.get("/session-check", (req, res) => {
    if (req.session.userId) {
        return res.json({ loggedIn: true, redirectPath: "/dsb" });
    }
    res.json({ loggedIn: false });
});

/* app.post("/create", async (req, res) => {
    try {
        const newUser = {
            _id: new ObjectId(),
            firstName: "Shaho",
            middleName: "Santos",
            lastName: "Panaligan",
            extName: null,
            email: "shaho@gmail.com",
            username: "Shaho",
            password: "admin2025",
            access: 1,
            verify: 1,
            reset: 0,
            archive: 0,
            phone: "09335674567",
            address: "Gapan City"
        };

        const existingUser = await db.collection("user").findOne({ username: newUser.username });
        if (existingUser) {
            console.log("User already exists:", newUser.username);
            return res.render("index", { error: "Username already exists.", layout: "layout", title: "Home", activePage: "home" });
        }

        await db.collection("user").insertOne(newUser);
        console.log("✅ New user created:", newUser.username);

        res.render("index", { error: "Account successfully created!", layout: "layout", title: "Home", activePage: "home" });
    } catch (err) {
        console.error("❌ Error creating user:", err);
        res.render("index", { error: "Error creating account. Please try again.", layout: "layout", title: "Home", activePage: "home" });
    }
}); */


app.post("/login2", async (req, res) => { 
    try {
        const { username, password, autoLogin } = req.body;

        const user = await db.collection("user").findOne({ 
            username: { $regex: new RegExp(`^${username}$`, "i") } 
        });

        if (!user) {
            console.log("User not found:", username);
            return res.send('<script>alert("Invalid username."); window.location="/index2";</script>');
        }

        console.log("User found:", user);
        if (!autoLogin) {
            if (user.password !== password) {
                console.log("Password mismatch for user:", username);
                return res.send('<script>alert("Invalid username or password."); window.location="/index2";</script>');
            }
        }

        req.session.userId = user._id;
        req.session.access = user.access;

        console.log("Session set:", req.session);

        const redirectPath = user.access === 1 ? "/dsb" : user.access === 0 ? "/hom" : "/index2";
        return res.redirect(redirectPath);

    } catch (err) {
        console.error("Login Error:", err.message);
        return res.send('<script>alert("An error occurred. Please try again later."); window.location="/";</script>');
    }
});

app.get("/logout", (req, res) => {
    req.session.destroy((err) => {
        if (err) {
            console.error("Logout Error:", err.message);
            return res.status(500).json({ error: "Logout failed" });
        }
        res.redirect("/");
    });
});


app.get("/dsb", isLogin, (req, res) => 
    res.render("dsb", { 
        error: "", 
        layout: "layout", 
        title: "Dashboard", 
        activePage: "dsb",
        user: req.user
    })
);

app.get("/update", isLogin, (req, res) => 
    res.render("update", { 
        error: "", 
        layout: "layout", 
        title: "Update Details", 
        activePage: "update",
        user: req.user
    })
);

app.get("/reset", isLogin, (req, res) => 
    res.render("reset", { 
        error: "", 
        layout: "layout", 
        title: "Reset Password", 
        activePage: "reset",
        user: req.user
    })
);

app.get("/sched", isLogin, (req, res) => 
    res.render("sched", { 
        error: "", 
        layout: "layout", 
        title: "Schedule", 
        activePage: "sched",
        user: req.user
    })
);

function getRangeFromFilter(filter, startStr, endStr, dateStr) {
  const now = new Date();
  let start, end;

  switch ((filter || "").toLowerCase()) {
    case "today":
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
      end   = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      break;

    case "thisweek":
    case "week":
      const day = (now.getDay() + 6) % 7;
      start = new Date(now.getFullYear(), now.getMonth(), now.getDate() - day, 0, 0, 0);
      end   = new Date(start.getFullYear(), start.getMonth(), start.getDate() + 6, 23, 59, 59, 999);
      break;

    case "thismonth":
    case "month":
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      break;

    case "thisyear":
    case "year":
      start = new Date(now.getFullYear(), 0, 1, 0, 0, 0);
      end   = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      break;

    case "daterange":
      if (!startStr || !endStr) return null;
      start = new Date(startStr);
      start.setHours(0,0,0,0);
      end = new Date(endStr);
      end.setHours(23,59,59,999);
      break;

    case "date":
      if (!dateStr) return null;
      start = new Date(dateStr);
      start.setHours(0,0,0,0);
      end = new Date(dateStr);
      end.setHours(23,59,59,999);
      break;

    default:
      start = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0);
      end   = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
  }

  return { start, end };
}

app.get("/analytics", async (req, res) => {
  try {
    const { filter, start, end, date } = req.query;
    const collection = db.collection("appointment");

    const now = new Date();
    let startDate, endDate;

    switch (filter) {
      case "today":
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
        break;
      case "thisweek": {
        const day = now.getUTCDay();
        const diff = now.getUTCDate() - day;
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff));
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), diff + 7));
        break;
      }
      case "thismonth":
        startDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
        endDate = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
        break;
      case "thisyear":
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = new Date(now.getFullYear() + 1, 0, 1);
        break;
      case "date":
        if (!date) return res.json({ success: false, message: "Missing date" });
        startDate = new Date(date);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(startDate);
        endDate.setDate(endDate.getDate() + 1);
        break;
      case "daterange":
        if (!start || !end) return res.json({ success: false, message: "Missing range" });
        startDate = new Date(start);
        startDate.setHours(0, 0, 0, 0);
        endDate = new Date(end);
        endDate.setDate(endDate.getDate() + 1);
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1);
    }

    const query = {
      createdAt: { $gte: startDate, $lt: endDate },
      $or: [{ archive: 0 }, { archive: "0" }]
    };

    const appointments = await collection.find(query).toArray();

    // 🔹 Totals with percentage added
    const total = appointments.length;
    const pending = appointments.filter(a => a.status?.toLowerCase() === "pending").length;
    const success = appointments.filter(a => a.status?.toLowerCase() === "success").length;
    const cancelled = appointments.filter(a => a.status?.toLowerCase() === "cancelled").length;
    const totalUnpaid = appointments.filter(a => a.pay?.toLowerCase() === "unpaid").length;

    const percent = count => total === 0 ? 0 : ((count / total) * 100).toFixed(2);

    const totals = {
      total,
      pending,
      success,
      cancelled,
      totalUnpaid,
      percentPending: percent(pending),
      percentSuccess: percent(success),
      percentCancelled: percent(cancelled),
      percentUnpaid: percent(totalUnpaid)
    };

    const leadTimes = appointments
      .filter(a => a.startAt && a.createdAt)
      .map(a => (new Date(a.startAt) - new Date(a.createdAt)) / (1000 * 60 * 60 * 24));

    const durations = appointments
      .filter(a => a.startAt && a.endAt)
      .map(a => (new Date(a.endAt) - new Date(a.startAt)) / (1000 * 60 * 60 * 24));

    const avgLeadDays = leadTimes.length ? (leadTimes.reduce((a, b) => a + b, 0) / leadTimes.length).toFixed(1) : 0;
    const avgDurationDays = durations.length ? (durations.reduce((a, b) => a + b, 0) / durations.length).toFixed(1) : 0;
    const totalBookedDays = durations.length ? durations.reduce((a, b) => a + b, 0).toFixed(1) : 0;

    const utilization = appointments.length
      ? ((appointments.filter(a => a.status?.toLowerCase() === "success").length / appointments.length) * 100).toFixed(1)
      : 0;

    const timeSeries = {};
    for (const a of appointments) {
      const d = new Date(a.createdAt);

      let label;
      if (filter === "thisyear") {
        label = d.toLocaleDateString("en-US", { month: "short" });
      } else if (filter === "thismonth" || filter === "thisweek" || filter === "daterange") {
        label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      } else {
        label = d.toLocaleDateString("en-US", { month: "short", day: "numeric" });
      }

      if (!timeSeries[label]) {
        timeSeries[label] = { total: 0, success: 0, cancelled: 0, earnings: 0 };
      }

      timeSeries[label].total++;
      if (a.status?.toLowerCase() === "success") timeSeries[label].success++;
      if (a.status?.toLowerCase() === "cancelled") timeSeries[label].cancelled++;

      const pkg = a.package?.toLowerCase() || "";
      const costMap = { basic: 5000, standard: 10000, premium: 20000 };
      const cost = costMap[pkg] || 0;

      const isPaid = ["paid", "yes", "true"].includes(a.pay?.toString().toLowerCase());
      if (isPaid) {
        timeSeries[label].earnings += cost;
      }
    }

    const monthOrder = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    let timeSeriesArray = Object.entries(timeSeries).map(([label, v]) => ({ label, ...v }));

    if (filter === "thisyear") {
      timeSeriesArray.sort((a, b) => monthOrder.indexOf(a.label) - monthOrder.indexOf(b.label));
    } else {
      timeSeriesArray.sort((a, b) => new Date(a.label) - new Date(b.label));
    }

    const packageStats = {};
    for (const a of appointments) {
      const pkg = a.package || "Unknown";
      packageStats[pkg] = (packageStats[pkg] || 0) + 1;
    }
    const packages = Object.entries(packageStats).map(([id, count]) => ({ _id: id, count }));

    const clientStats = {};
    for (const a of appointments) {
      const client = a.bookBy || "Unknown";
      clientStats[client] = (clientStats[client] || 0) + 1;
    }
    const topClients = Object.entries(clientStats)
      .map(([bookBy, count]) => ({ bookBy, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const payStats = {
      Paid: appointments.filter(a => a.pay?.toLowerCase() === "paid").length,
      Unpaid: totalUnpaid
    };

    // 🔹 NEW: Event type counts and percentages
    const eventStats = {};
        for (const a of appointments) {
          const event = a.event || "Unknown";
          eventStats[event] = (eventStats[event] || 0) + 1;
        }
      const eventArray = Object.entries(eventStats).map(([event, count]) => ({
      _id: event,
      count,
      percent: percent(count)
    }));

    const recent = appointments
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10);

    res.json({
      success: true,
      totals,
      avgLeadDays,
      avgDurationDays,
      totalBookedDays,
      utilization,
      timeSeries: timeSeriesArray,
      packages,
      topClients,
      payStats,
      events: eventArray,
      recent
    });
  } catch (err) {
    console.error("❌ /analytics error:", err);
    res.json({ success: false, message: "Server error" });
  }
});



app.get("/prf", isLogin, (req, res) => 
    res.render("prf", { 
        error: "", 
        layout: "layout", 
        title: "Profile", 
        activePage: "prf",
        user: req.user
    })
);

app.get("/api/prf", isLogin, (req, res) => {
    res.json({ user: req.user });
});

app.post("/create-client", async (req, res) => {
  try {
    const { firstName, middleName, lastName, extName, email, phone, address } = req.body;

    const randomPassword = crypto.randomBytes(6).toString("hex");
    const username = email;

    const existingUser = await db.collection("user").findOne({
      $or: [{ email }, { username }]
    });

    if (existingUser) {
      return res.render("clt", {
        layout: "layout",
        title: "Clients",
        activePage: "clt",
        message: "⚠️ Email already exists!",
      });
    }

    const newUser = {
      _id: new ObjectId(),
      firstName,
      middleName,
      lastName,
      extName: extName || null,
      email,
      username,
      password: randomPassword,
      access: 0,
      verify: 1,
      reset: 0,
      archive: 0,
      phone,
      address,
    };

    await db.collection("user").insertOne(newUser);
    console.log("✅ New client created:", email);

    res.render("clt", {
      layout: "layout",
      title: "Clients",
      activePage: "clt",
      message: "✅ Client successfully added!",
    });

  } catch (err) {
    console.error("❌ Error creating client:", err);
    res.render("clt", {
      layout: "layout",
      title: "Clients",
      activePage: "clt",
      message: "❌ Error creating client. Please try again.",
    });
  }
});

app.get("/clt", isLogin, async (req, res) => {
    try {
        const users = await db.collection("user").find({
            $and: [
                { $or: [{ archive: 0 }, { archive: "0" }] },
                { $or: [{ access: 0 }, { access: "0" }] }
            ]
        }).toArray();

        res.render("clt", { 
            error: "", 
            layout: "layout", 
            title: "Clients", 
            activePage: "clt",
            user: req.user,
            users
        });

    } catch (err) {
        console.error("Error fetching users:", err);
        res.render("clt", { 
            error: "Failed to load users", 
            layout: "layout", 
            title: "Clients", 
            activePage: "clt",
            user: req.user,
            users: [] 
        });
    }
});

app.post("/new-book", isLogin, async (req, res) => {
  try {
    const {
      bookBy,
      package,
      startAt,
      endAt,
      purok,
      barangay,
      city,
      province,
      landmark,
      phone,
      email,
      event,
      pay,
      otherEvent
    } = req.body;

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const conflict = await db.collection("appointment").findOne({
      $and: [
        { $or: [{ archive: 0 }, { archive: "0" }] },
        { startAt: { $lte: endDate } },
        { endAt: { $gte: startDate } }
      ]
    });

    if (conflict) {
      return res.status(400).json({ success: false, message: "Date unavailable" });
    }

    const newBooking = {
      _id: new ObjectId(),
      bookBy,
      package,
      startAt: startDate,
      endAt: endDate,
      purok,
      barangay,
      city,
      province,
      landmark,
      phone,
      event,
      otherEvent: otherEvent,
      email,
      status: "Pending",
      archive: 0,
      pay: "Unpaid",
      createdAt: new Date()
    };

    await db.collection("appointment").insertOne(newBooking);
    console.log("✅ New booking created for:", bookBy);

    res.json({ success: true, message: "Booking created", redirectPath: '/app' });

  } catch (err) {
    console.error("❌ Error creating booking:", err);
    res.status(500).json({ success: false, message: "Error creating booking. Please try again." });
  }
});

app.post("/new-book2", async (req, res) => {
  try {
    const {
      bookBy,
      package,
      startAt,
      endAt,
      purok,
      barangay,
      city,
      province,
      landmark,
      phone,
      email,
      event,
      pay,
      otherEvent
    } = req.body;

    const startDate = new Date(startAt);
    const endDate = new Date(endAt);

    const conflict = await db.collection("appointment").findOne({
      $and: [
        { $or: [{ archive: 0 }, { archive: "0" }] },
        { startAt: { $lte: endDate } },
        { endAt: { $gte: startDate } }
      ]
    });

    if (conflict) {
      return res.status(400).json({ success: false, message: "Date unavailable" });
    }

    const newBooking = {
      _id: new ObjectId(),
      bookBy,
      package,
      startAt: startDate,
      endAt: endDate,
      purok,
      barangay,
      city,
      province,
      landmark,
      phone,
      email,
      event: event ?? "Unknown",
      otherEvent: otherEvent,
      status: "Pending",
      archive: 0,
      pay: "Unpaid",
      createdAt: new Date()
    };

    await db.collection("appointment").insertOne(newBooking);
    console.log("✅ New booking created for:", bookBy);

    res.json({ success: true, message: "Booking created" });

  } catch (err) {
    console.error("❌ Error creating booking:", err);
    res.status(500).json({ success: false, message: "Error creating booking. Please try again." });
  }
});

app.get("/booked-dates", async (req, res) => {
  try {
    const booked = await db.collection("appointment").find({
      $and: [
        { $or: [{ archive: 0 }, { archive: "0" }] },
        { status: { $ne: "Cancelled" } }
      ]
    }).toArray();

    res.json(booked);
  } catch (err) {
    console.error("Error fetching booked dates:", err);
    res.json([]);
  }
});

app.get("/booked-dates2", async (req, res) => {
  try {
    const { id } = req.query;

    const filter = {
      $and: [
        { $or: [{ archive: 0 }, { archive: "0" }] },
        { status: { $ne: "Cancelled" } }
      ]
    };

    if (id) {
      filter.$and.push({ _id: { $ne: new ObjectId(id) } });
    }

    const booked = await db.collection("appointment").find(filter).toArray();

    res.json(booked);
  } catch (err) {
    console.error("Error fetching booked dates:", err);
    res.json([]);
  }
});


app.get("/app", isLogin, async (req, res) => {
  try {
    const apt = await db.collection("appointment")
      .find({ $or: [{ archive: 0 }, { archive: "0" }] })
      .sort({ startAt: -1 })
      .toArray();

    const message = req.session.message || "";
    req.session.message = "";

    // Expand each appointment’s date range
    const bookedDates = [];
    for (const a of apt) {

      if (a.status === "Cancelled") continue;   // ← critical line

      const start = new Date(a.startAt);
      const end = new Date(a.endAt);

      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        bookedDates.push({
          date: d.toLocaleDateString("en-CA", { timeZone: "Asia/Manila" }),
          pay: a.pay || "Unpaid",
        });
      }
    }

    res.render("app", {
      layout: "layout",
      title: "Appointments",
      activePage: "app",
      user: req.user,
      apt,
      message,
      bookedDates,
    });
  } catch (err) {
    console.error("❌ Error fetching appointments:", err);
    res.render("app", {
      layout: "layout",
      title: "Appointments",
      activePage: "app",
      user: req.user,
      apt: [],
      message: "Error loading appointments.",
      bookedDates: [],
    });
  }
});


app.get("/archive", isLogin, async (req, res) => {
  try {
    const apt = await db.collection("appointment")
      .find({ $or: [{ archive: 1 }, { archive: "1" }] })
      .sort({ startAt: -1 })
      .toArray();

    const message = req.session.message || "";
    req.session.message = "";

    // Expand each appointment’s date range
    const bookedDates = [];
    for (const a of apt) {
      const start = new Date(a.startAt);
      const end = new Date(a.endAt);
      for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
        bookedDates.push({
          date: d.toISOString().split("T")[0],
          pay: a.pay || "Unpaid",
        });
      }
    }

    res.render("archive", {
      layout: "layout",
      title: "Archive Appointments",
      activePage: "app",
      user: req.user,
      apt,
      message,
      bookedDates,
    });
  } catch (err) {
    console.error("❌ Error fetching appointments:", err);
    res.render("app", {
      layout: "layout",
      title: "Appointments",
      activePage: "app",
      user: req.user,
      apt: [],
      message: "Error loading appointments.",
      bookedDates: [],
    });
  }
});

app.get("/view/:id", isLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await db.collection("appointment").findOne({ _id: new ObjectId(id) });

    if (!appointment) {
      req.session.message = "Appointment not found!";
      return res.redirect("/app");
    }

    const message = req.session.message || "";
    req.session.message = "";

    res.render("view", {
      layout: "layout",
      title: "View Appointment",
      activePage: "app",
      user: req.user,
      appointment,
      back: "app",
      message
    });
  } catch (err) {
    console.error("❌ Error loading appointment:", err);
    req.session.message = "Error loading appointment details.";
    res.redirect("/app");
  }
});

app.get("/view2/:id", isLogin, async (req, res) => {
  try {
    const { id } = req.params;
    const appointment = await db.collection("appointment").findOne({ _id: new ObjectId(id) });

    if (!appointment) {
      req.session.message = "Appointment not found!";
      return res.redirect("/app");
    }

    const message = req.session.message || "";
    req.session.message = "";

    res.render("view", {
      layout: "layout",
      title: "View Appointment",
      activePage: "app",
      user: req.user,
      appointment,
      message,
      back: "archiv",
    });
  } catch (err) {
    console.error("❌ Error loading appointment:", err);
    req.session.message = "Error loading appointment details.";
    res.redirect("/app");
  }
});

app.post("/update-book", isLogin, async (req, res) => {
  try {
    const {
      id,
      bookBy,
      purok,
      barangay,
      city,
      province,
      landmark,
      phone,
      email,
      package,
      startAt,
      event,
      otherEvent,
      endAt,
    } = req.body;

    const _id = new ObjectId(id);

    await db.collection("appointment").updateOne(
      { _id },
      {
        $set: {
          bookBy,
          purok,
          barangay,
          city,
          province,
          landmark,
          phone,
          email,
          package,
          event,
          otherEvent: otherEvent,
          startAt,
          endAt
        }
      }
    );

    req.session.message = "Appointment updated successfully!";
    res.redirect(`/view/${id}`);
  } catch (err) {
    console.error("❌ Error updating appointment:", err);
    req.session.message = "Error updating appointment.";
    res.redirect("/app");
  }
});

app.post("/update-status", async (req, res) => {
  try {
    const { id, status } = req.body;

    if (!id || !status) {
      return res.json({ success: false, message: "Invalid request data." });
    }

    let result;

    if (status == "Cancelled") {
      result = await db.collection("appointment").updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status, pay: 'Unpaid' } }
      );
    } else {
      result = await db.collection("appointment").updateOne(
        { _id: new ObjectId(id) },
        { $set: { status: status } }
      );
    }

    if (result.modifiedCount > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "No changes made or record not found." });
    }
  } catch (err) {
    console.error("Error updating status:", err);
    res.json({ success: false, message: "Server error while updating status." });
  }
});

app.post("/update-payment", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ success: false, message: "Invalid request data." });
    }

    const result = await db.collection("appointment").updateOne(
      { _id: new ObjectId(id) },
      { $set: { pay: "Paid" } }
    );

    if (result.modifiedCount > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "No changes made or record not found." });
    }
  } catch (err) {
    console.error("Error updating payment:", err);
    res.json({ success: false, message: "Server error while updating payment." });
  }
});

app.post("/archiv", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ success: false, message: "Invalid request data." });
    }

    const result = await db.collection("appointment").updateOne(
      { _id: new ObjectId(id) },
      { $set: { archive: 1 } }
    );

    if (result.modifiedCount > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "No changes made or record not found." });
    }
  } catch (err) {
    console.error("Error updating payment:", err);
    res.json({ success: false, message: "Server error while archiving." });
  }
});

app.post("/archiv2", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ success: false, message: "Invalid request data." });
    }

    const result = await db.collection("appointment").updateOne(
      { _id: new ObjectId(id) },
      { $set: { archive: 0 } }
    );

    if (result.modifiedCount > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "No changes made or record not found." });
    }
  } catch (err) {
    console.error("Error updating payment:", err);
    res.json({ success: false, message: "Server error while restoring." });
  }
});

app.post("/revert", async (req, res) => {
  try {
    const { id } = req.body;

    if (!id) {
      return res.json({ success: false, message: "Invalid request data." });
    }

    const result = await db.collection("appointment").updateOne(
      { _id: new ObjectId(id) },
      { $set: { pay: "Unpaid", status: "Pending" } }
    );

    if (result.modifiedCount > 0) {
      res.json({ success: true });
    } else {
      res.json({ success: false, message: "No changes made or record not found." });
    }
  } catch (err) {
    console.error("Error reverting payment:", err);
    res.json({ success: false, message: "Server error while reverting status." });
  }
});

app.get("/genr", async (req, res) => {
  try {
    const collection = db.collection("appointment");

    const packages = ["Basic", "Standard", "Premium"];
    const statuses = ["Pending", "Success", "Cancelled"];
    const puroks = ["Purok 1", "Purok 2", "Purok 3", "Purok 4", "Purok 5"];
    const barangay = "Valdefuente";
    const city = "Science City of Muñoz";
    const province = "Nueva Ecija";

    const names = [
      "Sheena Marie Valdez", "Michael Jackson", "Havanna Oohnana", "John Doe", "Jane Cruz", "Carlos Ramos",
      "Ella Santiago", "Miguel Torres", "Alexa Dela Peña", "Joshua Reyes", "Kristine Bautista", "Nathan Lim",
      "Andrea Santos", "Bryan Dizon", "Carla Mendoza", "Daniel Navarro", "Erika Lopez", "Francis Cruz",
      "Grace Tan", "Henry Villanueva", "Ivy Morales", "Josephine Ong", "Kevin dela Cruz", "Lara Flores",
      "Mark Ramirez", "Nicole Bautista", "Oscar Fernandez", "Paula Domingo", "Quinn Garcia", "Rhea Aquino",
      "Steven Perez", "Tina Salazar", "Ulysses Castro", "Vanessa Ortiz", "Warren Santos", "Yna Gutierrez", "Zack Reyes"
    ];

    const now = new Date();
    const records = [];

    const randomDate = (start, end) =>
      new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));

    // Track all booked days (YYYY-MM-DD) to avoid overlaps
    const bookedDays = new Set();

    // Helper: generate all days between start and end
    const getDatesBetween = (start, end) => {
      const dates = [];
      const current = new Date(start);
      while (current <= end) {
        dates.push(current.toISOString().split("T")[0]);
        current.setDate(current.getDate() + 1);
      }
      return dates;
    };

    // Generate 40 non-overlapping appointments
    const totalAppointments = 40;
    let attempts = 0;
    while (records.length < totalAppointments && attempts < totalAppointments * 10) {
      attempts++;

      // Random range within this year
      const startYear = now.getFullYear();
      const startAt = randomDate(
        new Date(startYear, 0, 1),
        new Date(startYear, 11, 31)
      );

      const durationDays = Math.floor(Math.random() * 10) + 1; // 1–10 days
      const endAt = new Date(startAt);
      endAt.setDate(startAt.getDate() + durationDays);

      const dateRange = getDatesBetween(startAt, endAt);

      // Check overlap
      const hasOverlap = dateRange.some((d) => bookedDays.has(d));
      if (hasOverlap) continue; // skip if overlaps

      // Mark days as booked
      dateRange.forEach((d) => bookedDays.add(d));

      const pkg = packages[Math.floor(Math.random() * packages.length)];
      const status = statuses[Math.floor(Math.random() * statuses.length)];
      const pay = Math.random() > 0.5 ? "Paid" : "Unpaid";

      records.push({
        _id: new ObjectId(),
        bookBy: names[Math.floor(Math.random() * names.length)],
        package: pkg,
        startAt,
        endAt,
        purok: puroks[Math.floor(Math.random() * puroks.length)],
        barangay,
        city,
        province,
        landmark: "Near plaza",
        phone: "09" + Math.floor(100000000 + Math.random() * 900000000),
        email: `user${Math.floor(Math.random() * 10000)}@example.com`,
        status,
        pay,
        archive: 0,
        dump: 1,
        createdAt: startAt
      });
    }

    await collection.insertMany(records);

    console.log(`✅ ${records.length} non-overlapping appointments inserted.`);
    res.send(`✅ ${records.length} random non-overlapping appointments generated successfully.`);
  } catch (err) {
    console.error("❌ Error generating sample data:", err);
    res.status(500).send("Error generating sample data.");
  }
});


app.post("/update", isLogin, async (req, res) => {

    try {
        const { currentUsername, password } = req.body;

        const user = await db.collection("user").findOne({ _id: req.user._id });

        if (!user) {
            console.log("User not found:", currentUsername);
            return res.status(401).json({ error: "User not found." });
        }

        console.log("User found:", user);

        const hashedPassword = user.password;
        const match = await bcrypt.compare(password, hashedPassword);

        if (!match) {
            console.log("Password mismatch for user during profile update:", currentUsername);
            return res.status(401).json({ error: "Invalid password." });
        }

        if (user.suspend === 1 || user.suspend === "1") {
            console.log("Suspended account attempted profile update:", currentUsername);
            return res.status(403).json({ error: "Account Suspended!" });
        }

    const { id, firstName, middleName, lastName, extName, email, address, phone, username } = req.body;
    const _id = user._id;

    const updateData = {
      firstName,
      middleName,
      lastName,
      extName,
      email,
      username,
      address,
      phone
    };

    const result = await db.collection("user").updateOne({ _id }, { $set: updateData });

    if (result.modifiedCount > 0) {
      return res.status(200).json({ success: true, redirectPath: "/dsb" });
    } else {
      return res.status(400).json({ success: false, error: "No changes detected or user not found." });
    }

  } catch (err) {
    console.error("❌ Error updating user profile:", err);
    res.status(500).json({ error: "Error updating profile. Please try again." });
  }
});

app.post("/reset", isLogin, async (req, res) => {
  try {
    const { id, currentPassword, newPassword, confirmPassword } = req.body;

        const user = await db.collection("user").findOne({ _id: req.user._id });

        if (!user) {
            console.log("User not found during change password");
            return res.status(401).json({ error: "User not found." });
        }

        console.log("User found:", user);

        const hashedPassword = user.password;
        const match = await bcrypt.compare(currentPassword, hashedPassword);

        if (!match) {
            console.log("Password mismatch for user during profile update during change password");
            return res.status(401).json({ error: "Incorrect password." });
        }

        if (user.suspend === 1 || user.suspend === "1") {
            console.log("Suspended account attempted change password");
            return res.status(403).json({ error: "Account Suspended!" });
        }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({ success: false, error: "Passwords do not match!" });
    }

    const saltRounds = 10;
    const hashedNewPassword = await bcrypt.hash(newPassword, saltRounds);

    const _id = user._id;

    const changePwd = await db.collection("user").updateOne(
      { _id },
      { $set: { password: hashedNewPassword } }
    );

    if (changePwd.modifiedCount > 0) {
      res.status(200).json({ success: true, redirectPath: "/dsb"  });
    } else {
      res.status(400).json({ success: false, error: "No changes in password found."  });
    }

  } catch (err) {
    console.error("❌ Error resetting password:", err);
    res.status(500).json({ success: false, error: "Error resetting password." });
  }
});

app.post("/forgot", async (req, res) => {
  const { email } = req.body;

  try {
    const user = await db.collection("user").findOne({ email });

    if (!user) {
      req.session.error = "❌ Email not found.";
      return res.status(400).json({ error: "Email not found." });
    }

    const saltRounds = 10;
    const tempPlain = Math.random().toString(36).slice(-8);
    const tempPassword = await bcrypt.hash(tempPlain, saltRounds)

    await db.collection("user").updateOne(
      { _id: new ObjectId(user._id) },
      { $set: { password: tempPassword } }
    );

    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "johnniebre1995@gmail.com",
        pass: process.env.NODEMAILER_PASSWORD, // your Gmail app password
      },
      tls: {
        rejectUnauthorized: false, // fixes self-signed certificate issue
      },
    });

    const mailOptions = {
      from: "Banda ni Shaho <johnniebre1995@gmail.com>",
      to: email,
      subject: "Your Temporary Password",
      html: `
        <div style="font-family: Poppins, sans-serif;">
          <h2 style="color: #0077cc;">Banda ni Shaho</h2>
          <p>Hello <b>${user.firstName || "User"}</b>,</p>
          <p>Your password has been reset. Please use the temporary password below to log in:</p>
          <p style="font-size: 18px; font-weight: bold; background: #f0f0f0; padding: 8px 12px; border-radius: 5px; display: inline-block;">
            ${tempPlain}
          </p>
          <p>We recommend changing it immediately after logging in.</p>
          <br>
          <p style="font-size: 14px; color: gray;">– Banda ni Shaho</p>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);

    req.session.error = "✅ Temporary password sent to your email!";
    return res.status(200).json({
        success: true,
        message: "Temporary password sent to your email!"
    });

  } catch (error) {
    console.error("❌ Forgot Password Error:", error);
    req.session.error = "⚠️ An error occurred. Please try again later.";
    return res.status(500).json({ error: "An error occurred. Please try again later." });
  }
});

app.get("/api/appointments", async (req, res) => {
  try {
    const appointments = await db.collection("appointment")
      .find({ archive: 0 })
      .project({
        _id: 1,
        package: 1,
        startAt: 1,
        endAt: 1,
        status: 1
      })
      .toArray();

    res.json(appointments);
  } catch (error) {
    console.error("Error fetching appointments:", error);
    res.status(500).json({ error: "Server error" });
  }
});



// Private staff account creation. No public sign-up route or registration button.
const requireAdminForStaffCreation = (req, res, next) => {
    if (!req.user || !(req.user.access === 1 || req.user.access === "1")) {
        return res.status(403).send("Only an existing administrator can create staff accounts.");
    }
    next();
};

app.get("/staff/register", isLogin, requireAdminForStaffCreation, (req, res) => {
    if (!req.session.staffRegistrationToken) {
        req.session.staffRegistrationToken = crypto.randomBytes(32).toString("hex");
    }
    res.render("staff-register", {
        layout: false,
        csrfToken: req.session.staffRegistrationToken,
        error: "",
        success: "",
        values: {},
    });
});

app.post("/staff/register", isLogin, requireAdminForStaffCreation, async (req, res) => {
    const firstName = String(req.body.firstName || "").trim();
    const lastName = String(req.body.lastName || "").trim();
    const username = String(req.body.username || "").trim();
    const email = String(req.body.email || "").trim().toLowerCase();
    const password = String(req.body.password || "");
    const confirmPassword = String(req.body.confirmPassword || "");
    const values = { firstName, lastName, username, email };
    const renderResult = (status, error, success = "") => res.status(status).render("staff-register", {
        layout: false,
        csrfToken: req.session.staffRegistrationToken,
        error,
        success,
        values,
    });

    if (!req.session.staffRegistrationToken ||
        typeof req.body.csrfToken !== "string" ||
        req.body.csrfToken.length !== req.session.staffRegistrationToken.length ||
        !crypto.timingSafeEqual(Buffer.from(req.body.csrfToken), Buffer.from(req.session.staffRegistrationToken))) {
        return renderResult(403, "Session validation failed. Refresh the page and try again.");
    }
    if (!firstName || !lastName || !/^[a-zA-Z0-9._-]{3,40}$/.test(username) ||
        !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ||
        firstName.length > 80 || lastName.length > 80 || email.length > 200) {
        return renderResult(400, "Enter valid name, username (3–40 characters), and email.");
    }
    if (password.length < 10 || password.length > 128 || password !== confirmPassword) {
        return renderResult(400, "Passwords must match and contain 10–128 characters.");
    }
    try {
        const existing = await db.collection("user").findOne({
            $or: [
                { username: { $regex: `^${username.replace(/[^a-zA-Z0-9]/g, "\\$&")}$`, $options: "i" } },
                { email: { $regex: `^${email.replace(/[^a-zA-Z0-9]/g, "\\$&")}$`, $options: "i" } },
            ],
        });
        if (existing) return renderResult(409, "Username or email is already in use.");
        const hashedPassword = await bcrypt.hash(password, 12);
        await db.collection("user").insertOne({
            _id: new ObjectId(), firstName, middleName: "", lastName, extName: "",
            username, email, password: hashedPassword,
            access: 1, verify: 1, reset: 0, archive: 0, suspend: 0,
            createdAt: new Date(),
        });
        req.session.staffRegistrationToken = crypto.randomBytes(32).toString("hex");
        return res.render("staff-register", {
            layout: false, csrfToken: req.session.staffRegistrationToken,
            error: "", success: "Appointment manager account created. They can now log in at /lg.", values: {},
        });
    } catch (err) {
        console.error("Staff registration error:", err);
        return renderResult(500, "Could not create account. Please try again.");
    }
});

app.listen(PORT, "0.0.0.0", () => console.log(`🚀 Server running on port ${PORT}`));
