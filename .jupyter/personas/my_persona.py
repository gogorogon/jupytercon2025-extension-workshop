from jupyter_ai_persona_manager import BasePersona, PersonaDefaults
from jupyterlab_chat.models import Message
import os

# Path to avatar file (in same directory as persona file)
AVATAR_PATH = os.path.join(os.path.dirname(__file__), "avatar.svg")


class MyLocalPersona(BasePersona):
    @property
    def defaults(self):
        return PersonaDefaults(
            name="Local Dev Assistant",
            description="A persona for local development",
            avatar_path=AVATAR_PATH,
            system_prompt="You help with local development tasks.",
        )

    async def process_message(self, message: Message):
        self.send_message(f"Local persona received: {message.body}")