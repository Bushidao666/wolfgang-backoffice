from __future__ import annotations

from typing import Annotated, Any, Literal, Union

from pydantic import BaseModel, ConfigDict, Field, model_validator

ChannelType = Literal["whatsapp", "instagram", "telegram"]

InboundMediaType = Literal["image", "audio", "document"]
OutboundMessageType = Literal["text", "image", "video", "audio", "document"]


class MessageMedia(BaseModel):
    type: InboundMediaType
    url: str = Field(min_length=1)
    mime_type: str = Field(min_length=1)
    sha256: str | None = Field(default=None, min_length=10)


class MessageReceivedPayload(BaseModel):
    """
    Canonical payload for `message.received` events (multi-channel).

    Keep it permissive to support legacy producers:
    - `lead_external_id` may be missing; it will default to `from`.
    - `body` may be non-string (will be coerced) or null.
    """

    model_config = ConfigDict(populate_by_name=True, extra="ignore")

    instance_id: str = Field(min_length=1)
    lead_external_id: str | None = Field(default=None)
    from_: str = Field(alias="from", min_length=1)
    body: str | None = Field(default=None)
    media: MessageMedia | None = Field(default=None)
    raw: dict[str, Any] = Field(default_factory=dict)

    @model_validator(mode="before")
    @classmethod
    def _coerce_and_default(cls, data: Any):  # noqa: ANN401
        if not isinstance(data, dict):
            return data

        if "body" in data and data["body"] is not None and not isinstance(data["body"], str):
            data["body"] = str(data["body"])

        raw = data.get("raw")
        if raw is None:
            data["raw"] = {}
        elif not isinstance(raw, dict):
            data["raw"] = {"_raw": raw}

        lead_external_id = data.get("lead_external_id")
        from_value = data.get("from") or data.get("from_")
        if (lead_external_id is None or str(lead_external_id).strip() == "") and from_value is not None:
            data["lead_external_id"] = str(from_value)

        return data


class OutboundTextMessage(BaseModel):
    type: Literal["text"]
    text: str = Field(min_length=1)


class OutboundMediaMessage(BaseModel):
    type: Literal["image", "video", "audio", "document"]
    asset_id: str | None = None
    url: str | None = None
    mime_type: str | None = None
    caption: str | None = None
    filename: str | None = None

    @model_validator(mode="after")
    def _validate_source(self):
        if not self.asset_id and not self.url:
            raise ValueError("asset_id or url is required")
        if self.url and not self.mime_type:
            raise ValueError("mime_type is required when using url")
        return self


OutboundMessage = Annotated[
    Union[OutboundTextMessage, OutboundMediaMessage],
    Field(discriminator="type"),
]


class MessageSentPayload(BaseModel):
    model_config = ConfigDict(extra="ignore")

    instance_id: str = Field(min_length=1)
    to: str = Field(min_length=1)
    messages: list[OutboundMessage] = Field(min_length=1)
    raw: dict[str, Any] = Field(default_factory=dict)
