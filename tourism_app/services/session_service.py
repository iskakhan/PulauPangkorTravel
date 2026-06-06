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

        return self.to_payload(session_token)

    def restore_session(self, session_token, access_key, visitor_name=None, created_at=None):
        self.cleanup()

        created_at = _parse_datetime(created_at) or datetime.now(timezone.utc)
        expires_at = created_at + self.session_ttl
        if expires_at <= datetime.now(timezone.utc):
            return None

        self.sessions[session_token] = {
            "access_key": access_key,
            "visitor_name": visitor_name,
            "created_at": created_at,
            "expires_at": expires_at,
        }

        return self.to_payload(session_token)

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

    def to_payload(self, session_token):
        session = self.get_session(session_token)
        if not session:
            return None

        remaining = session["expires_at"] - datetime.now(timezone.utc)
        return {
            "session_token": session_token,
            "expires_in_seconds": max(0, int(remaining.total_seconds())),
            "visitor_name": session.get("visitor_name") or "",
        }

    def cleanup(self):
        now = datetime.now(timezone.utc)
        expired_tokens = [
            token
            for token, session in self.sessions.items()
            if session["expires_at"] <= now
        ]
        for token in expired_tokens:
            del self.sessions[token]


def resolve_session(repository, session_service, session_token):
    token = str(session_token or "").strip()
    if not token:
        return None

    payload = session_service.to_payload(token)
    if payload:
        return payload

    if not hasattr(repository, "get_visitor_session"):
        return None

    record = repository.get_visitor_session(token)
    if not record:
        return None

    return session_service.restore_session(
        session_token=token,
        access_key=record.get("access_key") or "",
        visitor_name=record.get("visitor_name") or "",
        created_at=record.get("created_at"),
    )


def _parse_datetime(value):
    if isinstance(value, datetime):
        parsed = value
    elif value:
        try:
            parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))
        except ValueError:
            return None
    else:
        return None

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)
