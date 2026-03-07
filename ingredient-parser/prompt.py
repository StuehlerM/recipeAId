"""
Prompt construction for Ministral 3B ingredient parsing.
The system prompt is hardcoded server-side — the user never controls it.
"""

SYSTEM_PROMPT = (
    "Extract ingredients into a JSON LIST of objects. "
    "Input is in <ingredients> tags."
    "Required schema: [{\"name\": string, \"value\": number, \"unit\": string}]. "
    "If value unknown, use 0. If unit unknown, use \"\". "
    "Output ONLY the JSON list. No markdown. No text."
)

def build_prompt(ingredients_text: str, lang: str) -> str:
    """Return the full prompt string to send to Ollama."""
    lang_hint = f"The ingredients are written in {lang}." if lang else ""
    return (
        f"{SYSTEM_PROMPT}\n\n"
        f"{lang_hint}\n\n"
        f"<ingredients>\n{ingredients_text}\n</ingredients>"
    ).strip()
