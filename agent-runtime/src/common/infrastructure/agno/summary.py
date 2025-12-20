from __future__ import annotations

from dataclasses import dataclass
from datetime import datetime
from textwrap import dedent
from typing import Any, Dict, List, Optional, Type, Union

from pydantic import BaseModel

from agno.models.base import Model
from agno.models.utils import get_model
from agno.run.agent import Message
from agno.session.summary import SessionSummary, SessionSummaryResponse
from agno.utils.log import log_debug, log_warning


@dataclass
class IncrementalSessionSummaryManager:
    """
    A SessionSummaryManager variant that keeps summaries coherent even when we don't
    persist the full session runs history.

    We store only session state + the latest summary in `core.conversations.metadata->agno_session`.
    At each run, we update the summary using:
    - previous summary (if any)
    - messages from the current run window
    """

    model: Optional[Model] = None
    session_summary_prompt: Optional[str] = None
    summary_request_message: str = "Update the summary of the conversation."
    summaries_updated: bool = False

    def get_response_format(self, model: "Model") -> Union[Dict[str, Any], Type[BaseModel]]:  # type: ignore[name-defined]
        if model.supports_native_structured_outputs:
            return SessionSummaryResponse
        if model.supports_json_schema_outputs:
            return {
                "type": "json_schema",
                "json_schema": {
                    "name": SessionSummaryResponse.__name__,
                    "schema": SessionSummaryResponse.model_json_schema(),
                },
            }
        return {"type": "json_object"}

    def get_system_message(
        self,
        *,
        conversation: List[Message],
        previous_summary: Optional[SessionSummary],
        response_format: Union[Dict[str, Any], Type[BaseModel]],
    ) -> Message:
        if self.session_summary_prompt is not None:
            system_prompt = self.session_summary_prompt
        else:
            system_prompt = dedent("""\
            You maintain a running summary of the conversation between a user and an assistant.

            You will receive:
            - A previous summary (may be empty).
            - The most recent conversation messages (may be a window, not the full history).

            Task:
            - Produce an UPDATED summary that preserves important information from the previous summary
              and incorporates new important details from the recent messages.
            - Keep it concise and only include information useful for future interactions.
            - Do NOT make anything up. If something is uncertain, omit it.
            """)

        prev_text = ""
        if previous_summary is not None and isinstance(previous_summary.summary, str) and previous_summary.summary.strip():
            prev_text = previous_summary.summary.strip()

        system_prompt += "\n<previous_summary>\n"
        system_prompt += prev_text
        system_prompt += "\n</previous_summary>\n"

        conversation_messages: list[str] = []
        system_prompt += "<conversation>"
        for message in conversation:
            if message.role == "user":
                if not message.content or (isinstance(message.content, str) and message.content.strip() == ""):
                    media_types: list[str] = []
                    if hasattr(message, "images") and message.images:
                        media_types.append(f"{len(message.images)} image(s)")
                    if hasattr(message, "videos") and message.videos:
                        media_types.append(f"{len(message.videos)} video(s)")
                    if hasattr(message, "audio") and message.audio:
                        media_types.append(f"{len(message.audio)} audio file(s)")
                    if hasattr(message, "files") and message.files:
                        media_types.append(f"{len(message.files)} file(s)")

                    if media_types:
                        conversation_messages.append(f"User: [Provided {', '.join(media_types)}]")
                else:
                    conversation_messages.append(f"User: {message.content}")
            elif message.role in ["assistant", "model"]:
                conversation_messages.append(f"Assistant: {message.content}\n")

        system_prompt += "\n".join(conversation_messages)
        system_prompt += "</conversation>"

        if response_format == {"type": "json_object"}:
            from agno.utils.prompts import get_json_output_prompt

            system_prompt += "\n" + get_json_output_prompt(SessionSummaryResponse)  # type: ignore[arg-type]

        return Message(role="system", content=system_prompt)

    def _prepare_summary_messages(self, *, session) -> Optional[List[Message]]:  # noqa: ANN001
        if not session:
            return None

        self.model = get_model(self.model)
        if self.model is None:
            return None

        response_format = self.get_response_format(self.model)

        conversation = session.get_messages()  # type: ignore[attr-defined]
        if not conversation:
            return None

        system_message = self.get_system_message(
            conversation=conversation,
            previous_summary=getattr(session, "summary", None),
            response_format=response_format,
        )

        return [
            system_message,
            Message(role="user", content=self.summary_request_message),
        ]

    def _process_summary_response(self, summary_response, session_summary_model: "Model") -> Optional[SessionSummary]:  # type: ignore[override]
        if summary_response is None:
            return None

        if (
            session_summary_model.supports_native_structured_outputs
            and summary_response.parsed is not None
            and isinstance(summary_response.parsed, SessionSummaryResponse)
        ):
            session_summary = SessionSummary(
                summary=summary_response.parsed.summary,
                topics=summary_response.parsed.topics,
                updated_at=datetime.now(),
            )
            self.summary = session_summary
            log_debug("Session summary updated", center=True)
            return session_summary

        if isinstance(summary_response.content, str):
            try:
                from agno.utils.string import parse_response_model_str

                parsed_summary: SessionSummaryResponse = parse_response_model_str(  # type: ignore[assignment]
                    summary_response.content,
                    SessionSummaryResponse,
                )
                if parsed_summary is not None:
                    session_summary = SessionSummary(
                        summary=parsed_summary.summary,
                        topics=parsed_summary.topics,
                        updated_at=datetime.now(),
                    )
                    self.summary = session_summary
                    log_debug("Session summary updated", center=True)
                    return session_summary
                log_warning("Failed to parse session summary response")
            except Exception as exc:
                log_warning(f"Failed to parse session summary response: {exc}")

        return None

    def create_session_summary(self, session) -> Optional[SessionSummary]:  # noqa: ANN001
        log_debug("Creating session summary", center=True)
        self.model = get_model(self.model)
        if self.model is None:
            return None

        messages = self._prepare_summary_messages(session=session)
        if messages is None:
            log_debug("No meaningful messages to summarize, skipping session summary")
            return None

        response_format = self.get_response_format(self.model)
        summary_response = self.model.response(messages=messages, response_format=response_format)
        session_summary = self._process_summary_response(summary_response, self.model)

        if session is not None and session_summary is not None:
            session.summary = session_summary  # type: ignore[attr-defined]
            self.summaries_updated = True

        return session_summary

    async def acreate_session_summary(self, session) -> Optional[SessionSummary]:  # noqa: ANN001
        log_debug("Creating session summary", center=True)
        self.model = get_model(self.model)
        if self.model is None:
            return None

        messages = self._prepare_summary_messages(session=session)
        if messages is None:
            log_debug("No meaningful messages to summarize, skipping session summary")
            return None

        response_format = self.get_response_format(self.model)
        summary_response = await self.model.aresponse(messages=messages, response_format=response_format)
        session_summary = self._process_summary_response(summary_response, self.model)

        if session is not None and session_summary is not None:
            session.summary = session_summary  # type: ignore[attr-defined]
            self.summaries_updated = True

        return session_summary

