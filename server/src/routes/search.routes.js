import express from "express";
import auth from "../middleware/auth.js";
import { searchDocuments } from "../controllers/search.controller.js";

const router = express.Router();

router.get("/", auth, searchDocuments);

export default router;
