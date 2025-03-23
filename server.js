const express = require("express");
const path = require("path");
const mongoose = require("mongoose");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcryptjs");
const cors = require("cors");
const bodyParser = require("body-parser");
const Student = require("./models/student");
require('dotenv').config(); // Load environment variables from .env

const app = express();

// 🔹 Set View Engine to EJS
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// 🔹 Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, "public")));

mongoose.connect("mongodb://localhost:27017/votingDB", {
    useNewUrlParser: true,
    useUnifiedTopology: true
})
    .then(() => console.log("✅ MongoDB Connected"))
    .catch(err => console.log(err));

const SECRET_KEY = process.env.SECRET_KEY;

// 🏷️ Serve Login Page
app.get("/", (req, res) => {
    res.render("login");
});

// 🏷️ LOGIN ROUTE - Authenticate Students
app.post("/login", async (req, res) => {
    try {
        const { studentId, password } = req.body;

        // ⭐️ Server-Side Validation
        if (!studentId || !password) {
            return res.status(400).json({ msg: "❌ Please provide Student ID and Password" });
        }

        const student = await Student.findOne({ studentId });
        if (!student) return res.status(400).json({ msg: "❌ Student not found!" });

        const isMatch = await bcrypt.compare(password, student.password);
        if (!isMatch) return res.status(400).json({ msg: "❌ Invalid password!" });

        const token = jwt.sign({ id: student._id, studentId: student.studentId, hasVoted: student.hasVoted }, SECRET_KEY, { expiresIn: "1h" });

        // ✅ Send token and redirect URL
        res.json({ token, redirect: `/vote?studentId=${student.studentId}`, studentId: student.studentId }); // Include studentId in the response
    } catch (error) {
        console.error("Login error:", error);
        res.status(500).json({ msg: "❌ Server Error", error });
    }
});

// 🏷️ Middleware to Protect Voting Page
const verifyToken = (req, res, next) => {
    const token = req.headers.authorization;
    if (!token) return res.status(401).json({ msg: "❌ Unauthorized" });

    try {
        const decoded = jwt.verify(token.split(" ")[1], SECRET_KEY);
        req.student = decoded;
        next();
    } catch (err) {
        res.status(403).json({ msg: "❌ Invalid Token" });
    }
};

// 🏷️ Serve Voting Page (Only for Authenticated Users)
app.get("/vote", verifyToken, async (req, res) => {
    try {
        const student = await Student.findOne({ studentId: req.student.studentId });
        if (!student) return res.status(404).json({ msg: "❌ Student not found!" });

        res.render("vote", { studentId: student.studentId, hasVoted: student.hasVoted });
    } catch (error) {
        res.status(500).json({ msg: "❌ Server Error", error });
    }
});


// 🏷️ Voting Route
app.post("/vote", verifyToken, async (req, res) => {
    const { studentId } = req.student;

    const student = await Student.findOne({ studentId });
    if (!student || student.hasVoted) return res.status(400).json({ msg: "❌ You have already voted!" });

    student.hasVoted = true;
    await student.save();

    res.json({ msg: "✅ Vote submitted successfully!" });
});

// 🔹 Start the Server
const port = 5000;
app.listen(port, () => console.log(`🚀 Server running on port ${port}`));