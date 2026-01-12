import express from "express";
import axios from "axios";
import jwt from "jsonwebtoken";
import User from "../models/User.js";
import { getEnv } from "../utils/env.js";

const router = express.Router();

const FRONTEND_URL = getEnv(
  "FRONTEND_URL",
  "http://localhost:5173"
);

/* ---------------- GOOGLE LOGIN ---------------- */

router.get("/google", (req, res) => {
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_CLIENT_ID,
    redirect_uri: process.env.GOOGLE_CALLBACK_URL,
    response_type: "code",
    scope: "profile email",
    access_type: "offline",
    prompt: "consent",
  });

  res.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
});

/* ---------------- GOOGLE CALLBACK ---------------- */

router.get("/google/callback", async (req, res) => {
  const { code } = req.query;

  try {
    // Exchange code for token
    const { data } = await axios.post(
      "https://oauth2.googleapis.com/token",
      {
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code,
        redirect_uri: process.env.GOOGLE_CALLBACK_URL,
        grant_type: "authorization_code",
      }
    );

    const { access_token } = data;

    // Get user profile
    const { data: profile } = await axios.get(
      "https://www.googleapis.com/oauth2/v2/userinfo",
      {
        headers: { Authorization: `Bearer ${access_token}` },
      }
    );

    const { email, name, id } = profile;

    // Find or create user
    let user = await User.findOne({ email });
    if (!user) {
      user = await User.create({
        email,
        name,
        googleId: id,
      });
    }

    // Create JWT
    const token = jwt.sign(
      { id: user._id },
      process.env.JWT_SECRET,
      { expiresIn: "7d" }
    );

    // Set cookie
    res.cookie("token", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
    });

    // Redirect safely
    res.redirect(`${FRONTEND_URL}/me`);
  } catch (err) {
    console.error(err);
    res.status(500).json({ msg: "Google auth failed" });
  }
});

/* ---------------- LOGOUT ---------------- */

router.post("/logout", (req, res) => {
  res.clearCookie("token", {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
  });

  res.json({ msg: "Logged out" });
});

export default router;
