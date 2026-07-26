# agents package — specialist AI agents
#   orchestrator.py         — central coordinator, routes to specialist agents
#   analytics_agent.py      — domain score computation (pure math, no GPT)
#   phonics_agent.py        — letter confusion tracking (b/d, p/q, m/w, n/u)
#   reading_agent.py        — reading fluency & TTS usage analysis
#   memory_agent.py         — auditory/visual memory trainer
#   recommendation_agent.py — GPT-4o personalized activity recommendations
# NOTE: speech_agent.py is NOT present in this package. Speech analysis is
#       handled by a dedicated route outside the orchestrator flow.
