import json
import ssl
from urllib.parse import urlencode
from urllib.request import urlopen

import certifi

from tourism_app.services.errors import BadRequestError, ServiceError


class WeatherService:
    FORECAST_URL = "https://api.open-meteo.com/v1/forecast"

    WEATHER_LABELS = {
        0: "Langit cerah",
        1: "Kebanyakannya cerah",
        2: "Sebahagian berawan",
        3: "Berawan",
        45: "Berkabus",
        48: "Kabus tebal",
        51: "Renyai ringan",
        53: "Renyai sederhana",
        55: "Renyai lebat",
        61: "Hujan ringan",
        63: "Hujan sederhana",
        65: "Hujan lebat",
        80: "Hujan sekejap",
        81: "Hujan sekejap sederhana",
        82: "Hujan sekejap lebat",
        95: "Ribut petir",
        96: "Ribut petir berhujan batu",
        99: "Ribut petir kuat",
    }

    def __init__(self, timeout_seconds=8):
        self.timeout_seconds = timeout_seconds
        self.ssl_context = ssl.create_default_context(cafile=certifi.where())

    def get_current_weather(self, data):
        longitude, latitude = self._parse_coordinates(data)
        query = urlencode(
            {
                "latitude": latitude,
                "longitude": longitude,
                "current": ",".join(
                    [
                        "temperature_2m",
                        "relative_humidity_2m",
                        "apparent_temperature",
                        "precipitation",
                        "weather_code",
                        "cloud_cover",
                        "wind_speed_10m",
                        "wind_direction_10m",
                    ]
                ),
                "timezone": "auto",
                "forecast_days": 1,
            }
        )

        try:
            with urlopen(
                f"{self.FORECAST_URL}?{query}",
                timeout=self.timeout_seconds,
                context=self.ssl_context,
            ) as response:
                payload = json.loads(response.read().decode("utf-8"))
        except Exception as exc:
            raise ServiceError(f"Gagal memuat cuaca semasa: {exc}") from exc

        current = payload.get("current") or {}
        units = payload.get("current_units") or {}
        weather_code = self._to_int(current.get("weather_code"))

        return {
            "time": current.get("time"),
            "temperature_c": self._to_float(current.get("temperature_2m")),
            "apparent_temperature_c": self._to_float(current.get("apparent_temperature")),
            "humidity_percent": self._to_int(current.get("relative_humidity_2m")),
            "precipitation_mm": self._to_float(current.get("precipitation")),
            "cloud_cover_percent": self._to_int(current.get("cloud_cover")),
            "wind_speed_kmh": self._to_float(current.get("wind_speed_10m")),
            "wind_direction_deg": self._to_int(current.get("wind_direction_10m")),
            "weather_code": weather_code,
            "summary": self.WEATHER_LABELS.get(weather_code, "Cuaca semasa"),
            "units": units,
        }

    def _parse_coordinates(self, data):
        try:
            longitude = float(data.get("longitude"))
            latitude = float(data.get("latitude"))
        except (TypeError, ValueError) as exc:
            raise BadRequestError("Koordinat cuaca tidak sah") from exc

        if not self._is_valid_coordinate(latitude, longitude):
            raise BadRequestError("Koordinat cuaca di luar julat sah")

        return longitude, latitude

    def _is_valid_coordinate(self, latitude, longitude):
        return -90 <= latitude <= 90 and -180 <= longitude <= 180

    def _to_float(self, value):
        try:
            number = float(value)
        except (TypeError, ValueError):
            return None
        return round(number, 1)

    def _to_int(self, value):
        try:
            return int(round(float(value)))
        except (TypeError, ValueError):
            return None
