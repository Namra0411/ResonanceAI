import express from "express";
import auth from "../middleware/auth.js";
import upload from "../middleware/upload.js";
import {
  uploadDocument,
  listDocuments,
  deleteDocument,
  renameDocument,
} from "../controllers/documents.controller.js";

const router = express.Router();

router.post(
  "/upload",
  auth,
  upload.single("file"),
  uploadDocument
);

router.get("/", auth, listDocuments);

router.delete("/:id", auth, deleteDocument);

router.patch("/:id", auth, renameDocument);

export default router;
