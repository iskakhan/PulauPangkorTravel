from tourism_app.services.errors import BadRequestError, ForbiddenError, ServiceError


class GeofenceService:
    def __init__(self, repository, session_service, radius_meter):
        self.repository = repository
        self.session_service = session_service
        self.radius_meter = radius_meter

    def check_location(self, data):
        session_token = data.get("session_token")
        if not self.session_service.is_valid(session_token):
            raise ForbiddenError("Sesi tidak sah")

        longitude, latitude = self._parse_coordinates(data)

        try:
            return self.repository.get_destinations_in_geofence(
                longitude=longitude,
                latitude=latitude,
                radius_meter=self.radius_meter,
            )
        except Exception as exc:
            raise ServiceError(f"Gagal memanggil fungsi geofence: {exc}") from exc

    def _parse_coordinates(self, data):
        try:
            longitude = float(data.get("longitude"))
            latitude = float(data.get("latitude"))
        except (TypeError, ValueError) as exc:
            raise BadRequestError("Koordinat tidak sah") from exc

        if not self._is_valid_coordinate(latitude, longitude):
            raise BadRequestError("Koordinat di luar julat sah")

        return longitude, latitude

    def _is_valid_coordinate(self, latitude, longitude):
        return -90 <= latitude <= 90 and -180 <= longitude <= 180
