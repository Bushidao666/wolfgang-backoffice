from __future__ import annotations

# Backlog compatibility shim:
# - BACKLOG_VNEXT_AGNO.md references `media_decision_models.py`
# - BACKLOG_VNEXT_AGNO_DETALHADO.md references `media_plan_models.py`

from modules.centurion.agno_models.media_plan_models import MediaChannelPlan, MediaPlan

__all__ = ["MediaChannelPlan", "MediaPlan"]

