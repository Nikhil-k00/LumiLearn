import { Router } from "express";
import { submitGameSession, getPoolGame, getPoolCount, peekPoolGame } from "../controllers/gameController";
import { protect } from "../middleware/auth";

const router = Router();
router.post("/session",             protect, submitGameSession);
router.get("/pool/:gameType/peek",  protect, peekPoolGame);   // read without consuming
router.get("/pool/:gameType",       protect, getPoolGame);    // read + consume (Play Again)
router.get("/pool/:gameType/count", protect, getPoolCount);
export default router;
