"""
Sierra Estates — Gemini 2.5 Flash Structured WhatsApp Listing Extractor
Drop into: apps/api/services/whatsapp_extractor.py
Extracts Egyptian Arabic / Franco / English WhatsApp group messages into
strict JSON matching Easy Listing & Property Finder fields with per-field confidence.
"""

from __future__ import annotations

import os
from typing import Literal

from google import genai
from google.genai import types
from pydantic import BaseModel, Field


class FieldConfidence(BaseModel):
    compound: float = Field(ge=0.0, le=1.0)
    price_egp: float = Field(ge=0.0, le=1.0)
    area_sqm: float = Field(ge=0.0, le=1.0)
    source_type: float = Field(ge=0.0, le=1.0)


class ExtractedListing(BaseModel):
    compound: str = Field(description="Normalized compound or area name in New Cairo / Fifth Settlement")
    property_type: Literal["Apartment", "Villa", "Townhouse", "Twin House", "Duplex", "Penthouse", "Studio", "Commercial"]
    purpose: Literal["Rent", "Sale"]
    price_egp: float = Field(ge=0, description="Numeric price in EGP (convert K/M shorthand)")
    area_sqm: float = Field(ge=0, description="Built-up or total area in square meters")
    bedrooms: int = Field(ge=0, default=0)
    bathrooms: int = Field(ge=0, default=0)
    finishing: Literal["Core & Shell", "Semi-Finished", "Fully Finished", "Super Lux", "Ultra Super Lux", "Unknown"] = "Unknown"
    furnishing: Literal["Furnished", "Semi-Furnished", "Unfurnished", "Unknown"] = "Unknown"
    source_type: Literal["owner", "broker", "unknown"] = Field(
        description="owner if direct owner (مالك مباشر), broker if agent/co-broke (بروكر/وسيط)"
    )
    contact_phone: str | None = Field(default=None, description="Normalized Egyptian mobile e.g. +2010xxxxxxxx")
    is_request_not_offer: bool = Field(
        default=False,
        description="True if the message is a client/broker request (مطلوب) rather than an available unit (متاح)",
    )
    confidence: FieldConfidence
    low_confidence_flags: list[str] = Field(
        default_factory=list,
        description="List of field names with confidence < 0.75 for Easy Listing human review",
    )


SYSTEM_PROMPT = """You are a senior Egyptian real estate data parser for Sierra Estates (New Cairo / Fifth Settlement).
Extract structured property listing fields from raw WhatsApp group messages (Egyptian Arabic, Franco-Arabic, or English).
Rules:
1. Convert shorthand prices: '35k' / '35 الف' -> 35000; '8.5M' / '8 مليون ونص' -> 8500000.
2. Distinguish offers ('متاح', 'للإيجار', 'للبيع') from client requests ('مطلوب', 'عايز'). Set is_request_not_offer=true for requests.
3. Classify source_type='owner' ONLY if explicitly direct owner ('من المالك مباشرة', 'مالك'); if 'بروكر', 'عمولة', or brokerage signature, set 'broker'.
4. Score confidence honestly (0.0 to 1.0) and list any field < 0.75 in low_confidence_flags."""


def parse_whatsapp_message(raw_text: str, model: str = "gemini-2.5-flash") -> ExtractedListing:
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise RuntimeError("GEMINI_API_KEY is not configured")

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=model,
        contents=raw_text,
        config=types.GenerateContentConfig(
            system_instruction=SYSTEM_PROMPT,
            response_mime_type="application/json",
            response_schema=ExtractedListing,
            temperature=0.1,
        ),
    )
    parsed = ExtractedListing.model_validate_json(response.text)
    # Enforce flag consistency
    flags = list(parsed.low_confidence_flags)
    for fname, score in parsed.confidence.model_dump().items():
        if score < 0.75 and fname not in flags:
            flags.append(fname)
    parsed.low_confidence_flags = flags
    return parsed