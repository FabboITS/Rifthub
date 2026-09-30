from django.urls import path

from . import views

urlpatterns = [
    path("vod-summary/", views.vod_summary, name="ai-vod-summary"),
    path("scout-summary/", views.scout_summary, name="ai-scout-summary"),
    path("draft-advice/", views.draft_advice, name="ai-draft-advice"),
    path("agent/chat/", views.agent_chat, name="ai-agent-chat"),
    path("status/", views.ai_status, name="ai-status"),
]
