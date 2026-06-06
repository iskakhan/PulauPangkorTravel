from tourism_app.services.errors import BadRequestError, ServiceError, UnauthorizedError
from tourism_app.services.session_service import resolve_session


class VisitorFeedbackService:
    def __init__(self, repository, session_service):
        self.repository = repository
        self.session_service = session_service

    def submit_feedback(self, data):
        session_token = (data.get("session_token") or "").strip()
        try:
            session = resolve_session(self.repository, self.session_service, session_token)
        except Exception as exc:
            raise ServiceError(f"Gagal menyemak sesi: {exc}") from exc

        if not session:
            raise UnauthorizedError("Sesi tidak sah atau telah tamat")

        visit_comment = _normalize_comment(data.get("visit_comment"))
        system_comment = _normalize_comment(data.get("system_comment"))
        if not visit_comment and not system_comment:
            raise BadRequestError("Sila isi sekurang-kurangnya satu komen")

        try:
            feedback = self.repository.submit_visitor_feedback(
                session_token=session_token,
                visit_comment=visit_comment,
                system_comment=system_comment,
            )
        except Exception as exc:
            raise ServiceError(f"Gagal menyimpan maklum balas: {exc}") from exc

        if not feedback:
            raise ServiceError("Maklum balas tidak dapat dikemas kini")

        self.session_service.end_session(session_token)
        return {
            "submitted": True,
            "visitor_name": feedback.get("visitor_name"),
            "feedback_submitted_at": feedback.get("feedback_submitted_at"),
        }


def _normalize_comment(value):
    comment = str(value or "").strip()
    return comment[:1000] if comment else None
