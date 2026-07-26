import axios from "axios";

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || "http://localhost:8000";

export interface AIActivity {
  gameType:         string;
  title:            string;
  description:      string;
  targetArea:       string;
  difficulty:       number;
  estimatedMinutes: number;
  // Full GPT-generated game content — words, stories, rhyme pairs, etc.
  content?:         Record<string, unknown>;
}

export interface AIOrchestrationResult {
  updatedScores:         Record<string, number>;
  difficultyAdjustments: Record<string, number>;
  activities:            AIActivity[];
  focusAreas:            string[];
  encouragementMessage:  string;
  confusionSummary?:     Record<string, number>;
}

const aiService = {
  async orchestrate(payload: unknown): Promise<AIOrchestrationResult> {
    const { data } = await axios.post<AIOrchestrationResult>(
      `${AI_SERVICE_URL}/api/orchestrate`,
      payload,
      { timeout: 55000 }   // GPT-4o can take 30-50s under load — give it room
    );
    return data;
  },

  async analyzeAudio(formData: FormData): Promise<unknown> {
    const { data } = await axios.post(
      `${AI_SERVICE_URL}/api/speech/analyze`,
      formData,
      { timeout: 20000, headers: { "Content-Type": "multipart/form-data" } }
    );
    return data;
  },
};

export default aiService;
