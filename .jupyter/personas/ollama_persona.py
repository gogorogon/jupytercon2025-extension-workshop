from __future__ import annotations

import os

from jupyter_ai_persona_manager import BasePersona, PersonaDefaults
from jupyterlab_chat.models import Message
from ollama import chat, Client

# Path to avatar file (in same directory as persona file)
AVATAR_PATH = os.path.join(os.path.dirname(__file__), "avatar.svg")


class MyLocalPersona(BasePersona):
    @property
    def defaults(self):
        return PersonaDefaults(
            name="Ollama",
            description="A persona for local development",
            avatar_path=AVATAR_PATH,
            system_prompt="You help with local development tasks.",
        )

    async def process_message(self, message: Message):
        client = Client(host="http://localhost:8080")
        stream = client.chat(
            model="gemma3:1b",
            messages=[{"role": "user", "content": message.body}],
            stream=True,
        )

        async def generate_content():
            for chunk in stream:
                yield chunk["message"]["content"]

        await self.stream_message(generate_content())