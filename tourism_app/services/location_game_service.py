from tourism_app.services.errors import BadRequestError, ForbiddenError, ServiceError


class LocationGameService:
    def __init__(self, repository, session_service, default_radius_meter):
        self.repository = repository
        self.session_service = session_service
        self.default_radius_meter = default_radius_meter

    def list_active_locations(self):
        try:
            return self.repository.list_active_locations()
        except Exception as exc:
            raise ServiceError(f"Gagal memuat lokasi aktif: {exc}") from exc

    def get_nearby_locations(self, data):
        longitude, latitude = self._parse_coordinates(data)
        max_distance_meter = self._parse_distance(data.get("max_distance_m"))

        try:
            return self.repository.get_nearby_locations(
                latitude=latitude,
                longitude=longitude,
                max_distance_meter=max_distance_meter,
            )
        except Exception as exc:
            raise ServiceError(f"Gagal memanggil lokasi berdekatan: {exc}") from exc

    def get_location_detail(self, data):
        location_id = self._parse_location_id(data)

        try:
            return {
                "location": self.repository.get_location(location_id),
                "media": self.repository.get_location_media(location_id),
                "card": self.repository.get_location_card(location_id),
                "destinasi": self.repository.get_destinasi_for_location(location_id),
            }
        except Exception as exc:
            raise ServiceError(f"Gagal memuat butiran lokasi: {exc}") from exc

    def check_in_location(self, data, auth_token=None):
        session_token = data.get("session_token")
        if not auth_token and not self.session_service.is_valid(session_token):
            raise ForbiddenError("Log masuk diperlukan untuk unlock lokasi")

        if not auth_token:
            raise ForbiddenError("Supabase Auth diperlukan untuk menyimpan visit lokasi")

        location_id = self._parse_location_id(data, key="p_location_id")
        longitude, latitude = self._parse_coordinates(
            {
                "longitude": data.get("p_user_lng"),
                "latitude": data.get("p_user_lat"),
            }
        )

        try:
            return self.repository.check_in_location(
                location_id=location_id,
                latitude=latitude,
                longitude=longitude,
                auth_token=auth_token,
            )
        except Exception as exc:
            raise ServiceError(f"Gagal check-in lokasi: {exc}") from exc

    def _parse_location_id(self, data, key="location_id"):
        location_id = data.get(key) or data.get("location_id")
        if location_id in (None, ""):
            raise BadRequestError("ID lokasi diperlukan")
        return location_id

    def _parse_distance(self, value):
        if value in (None, ""):
            return self.default_radius_meter

        try:
            distance = float(value)
        except (TypeError, ValueError) as exc:
            raise BadRequestError("Jarak carian tidak sah") from exc

        if distance <= 0 or distance > 10000:
            raise BadRequestError("Jarak carian di luar julat sah")

        return int(round(distance))

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
