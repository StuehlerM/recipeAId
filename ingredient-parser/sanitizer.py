"""
Input sanitization for ingredient text before it is included in an LLM prompt.
Provides defense-in-depth against prompt injection attacks.
"""

import re

# Maximum characters of raw text sent to the LLM
MAX_INPUT_LENGTH = 2000

# LLM role/delimiter markers that could hijack the prompt structure
_ROLE_MARKERS = re.compile(
    r"\[/?INST\]|<<SYS>>|<\|system\|>|<\|user\|>|<\|assistant\|>",
    re.IGNORECASE,
)

# Common prompt-injection phrases
_INJECTION_PHRASES = re.compile(
    r"ignore\s+(previous|all|above)|disregard\s+(above|previous|instructions)|"
    r"new\s+instructions|you\s+are\s+now",
    re.IGNORECASE,
)

# Two or more consecutive whitespace characters (except newlines) → single space
_EXCESS_SPACES = re.compile(r"[^\S\n]{2,}")

# Control characters except tab (\x09) and newline (\x0a)
_CONTROL_CHARS = re.compile(r"[\x00-\x08\x0b-\x1f\x7f]")


def sanitize(text: str) -> str:
    """Return a sanitized copy of *text* safe for inclusion in an LLM prompt."""
    # 1. Strip control characters (keep \t and \n)
    text = _CONTROL_CHARS.sub("", text)

    # 2. Truncate to cap max length
    text = text[:MAX_INPUT_LENGTH]

    # 3. Remove LLM role markers
    text = _ROLE_MARKERS.sub("", text)

    # 4. Remove injection phrases
    text = _INJECTION_PHRASES.sub("", text)

    # 5. Collapse excessive whitespace (preserve newlines)
    text = _EXCESS_SPACES.sub(" ", text)

    return text.strip()
