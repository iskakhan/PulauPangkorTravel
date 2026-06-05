from dataclasses import dataclass
from datetime import datetime, timezone


@dataclass(frozen=True)
class SecurityKey:
    id: int
    access_key: str
    is_used: bool
    created_at: datetime

    @classmethod
    def from_record(cls, record):
        return cls(
            id=record["id"],
            access_key=record["access_key"],
            is_used=bool(record.get("is_used")),
            created_at=_parse_supabase_time(record.get("created_at")),
        )

    def is_expired(self, key_ttl):
        now = datetime.now(timezone.utc)
        return now - self.created_at > key_ttl


def _parse_supabase_time(value):
    if not value:
        raise ValueError("Nilai created_at kosong")

    if isinstance(value, datetime):
        parsed = value
    else:
        parsed = datetime.fromisoformat(str(value).replace("Z", "+00:00"))

    if parsed.tzinfo is None:
        return parsed.replace(tzinfo=timezone.utc)
    return parsed.astimezone(timezone.utc)
