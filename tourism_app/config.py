import os
from datetime import timedelta

from dotenv import load_dotenv

load_dotenv()


class Config:
    SUPABASE_URL = os.environ.get("SUPABASE_URL")
    SUPABASE_KEY = os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or os.environ.get("SUPABASE_KEY")

    KEY_TTL = timedelta(minutes=int(os.environ.get("KEY_TTL_MINUTES", "5")))
    SESSION_TTL = timedelta(minutes=int(os.environ.get("SESSION_TTL_MINUTES", "30")))
    GEOFENCE_RADIUS_METER = float(os.environ.get("GEOFENCE_RADIUS_METER", "50.0"))
    WEATHER_TIMEOUT_SECONDS = int(os.environ.get("WEATHER_TIMEOUT_SECONDS", "8"))
    MAPBOX_ACCESS_TOKEN = os.environ.get("MAPBOX_ACCESS_TOKEN", "")
    MAPBOX_STYLE_URL = os.environ.get("MAPBOX_STYLE_URL", "mapbox://styles/mapbox/streets-v12")

    HOST = os.environ.get("HOST", "0.0.0.0")
    PORT = int(os.environ.get("PORT", "5001"))
    DEBUG = os.environ.get("FLASK_DEBUG", "1") == "1"
    DEV_ACCESS_KEY = os.environ.get("DEV_ACCESS_KEY", "PANGKOR-IOS26-TEST")
    ENABLE_DEV_ACCESS_KEY = os.environ.get(
        "ENABLE_DEV_ACCESS_KEY",
        "1" if DEBUG else "0",
    ) == "1"

    @classmethod
    def validate(cls):
        if not cls.SUPABASE_URL or not cls.SUPABASE_KEY:
            raise RuntimeError("SUPABASE_URL dan SUPABASE_KEY mesti ditetapkan dalam fail .env")
