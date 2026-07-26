import { Router } from "express";
import {
  registerStudent,
  login,
  getMe,
  submitAssessment,
} from "../controllers/authController";
import { protect } from "../middleware/auth";

const router = Router();

router.post("/student/register", registerStudent);
router.post("/login", login);
router.get("/me", protect, getMe);
router.post("/assessment/:studentId", protect, submitAssessment);

export default router;
