import { Router } from "express";
import { getStudentDashboard, updateProfile } from "../controllers/studentController";
import { protect } from "../middleware/auth";

const router = Router();

router.get("/:id/dashboard", protect, getStudentDashboard);
router.put("/:id/profile", protect, updateProfile);

export default router;
