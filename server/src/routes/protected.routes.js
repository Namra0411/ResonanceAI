import express from "express";
import auth from "../middleware/auth.js";
import User from "../models/User.js";

const router = express.Router();

router.get("/me", auth, async (req, res) => {
  const user = await User.findById(req.userId).select("email name");
  if (!user) {
    return res.status(404).json({ msg: "User not found" });
  }
  res.json(user);
});

export default router;
