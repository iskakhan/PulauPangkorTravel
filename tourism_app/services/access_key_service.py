from tourism_app.models.security_key import SecurityKey
from tourism_app.services.errors import BadRequestError, ServiceError, UnauthorizedError


class AccessKeyService:
    def __init__(
        self,
        repository,
        session_service,
        key_ttl,
        dev_access_key=None,
        enable_dev_access_key=False,
    ):
        self.repository = repository
        self.session_service = session_service
        self.key_ttl = key_ttl
        self.dev_access_key = dev_access_key
        self.enable_dev_access_key = enable_dev_access_key

    def verify(self, access_key, visitor_name=None):
        if not access_key:
            raise BadRequestError("Kunci akses diperlukan")

        normalized_name = _normalize_visitor_name(visitor_name)
        if not normalized_name:
            raise BadRequestError("Nama pelawat diperlukan")

        if self.enable_dev_access_key and self.dev_access_key == access_key:
            return self._create_visitor_session("development-test-key", normalized_name)

        try:
            record = self.repository.get_security_key(access_key)
        except Exception as exc:
            raise ServiceError(f"Gagal menyemak kunci: {exc}") from exc

        if not record:
            raise UnauthorizedError("Kunci tidak sah")

        try:
            security_key = SecurityKey.from_record(record)
        except (KeyError, ValueError) as exc:
            raise ServiceError(f"Data kunci tidak sah: {exc}") from exc

        if security_key.is_used:
            raise UnauthorizedError("Kunci telah digunakan")

        if security_key.is_expired(self.key_ttl):
            raise UnauthorizedError("Masa kunci telah tamat")

        try:
            is_updated = self.repository.mark_security_key_used(security_key.id)
        except Exception as exc:
            raise ServiceError(f"Gagal mengemas kini kunci: {exc}") from exc

        if not is_updated:
            raise UnauthorizedError("Kunci telah digunakan")

        return self._create_visitor_session(security_key.access_key, normalized_name)

    def _create_visitor_session(self, access_key, visitor_name):
        session = self.session_service.create_session(access_key, visitor_name=visitor_name)
        try:
            self.repository.create_visitor_session(
                session_token=session["session_token"],
                access_key=access_key,
                visitor_name=visitor_name,
            )
        except Exception as exc:
            raise ServiceError(f"Gagal menyimpan nama pelawat: {exc}") from exc

        return session


def _normalize_visitor_name(visitor_name):
    name = " ".join(str(visitor_name or "").strip().split())
    if len(name) < 2:
        return None
    return name[:80]
