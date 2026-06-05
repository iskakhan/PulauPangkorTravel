import uuid
from datetime import datetime, timezone


class SessionService:
    def __init__(self, session_ttl):
        self.session_ttl = session_ttl
        self.sessions = {}

    def create_session(self, access_key, visitor_name=None):
        self.cleanup()

        now = datetime.now(timezone.utc)
        session_token = str(uuid.uuid4())
        self.sessions[session_token] = {
            "access_key": access_key,
            "visitor_name": visitor_name,
            "created_at": now,
            "expires_at": now + self.session_ttl,
        }

        return {
            "session_token": session_token,
            "expires_in_seconds": int(self.session_ttl.total_seconds()),
            "visitor_name": visitor_name,
        }

    def is_valid(self, session_token):
        self.cleanup()
        return bool(session_token and session_token in self.sessions)

    def get_session(self, session_token):
        self.cleanup()
        return self.sessions.get(session_token)

    def end_session(self, session_token):
        self.cleanup()
        if session_token in self.sessions:
            del self.sessions[session_token]
            return True
        return False

    def cleanup(self):
        now = datetime.now(timezone.utc)
        expired_tokens = [
            token
            for token, session in self.sessions.items()
            if session["expires_at"] <= now
        ]
        for token in expired_tokens:
            del self.sessions[token]
