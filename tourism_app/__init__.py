from flask import Flask
from flask_cors import CORS

from tourism_app.config import Config
from tourism_app.controllers.api_controller import api_blueprint
from tourism_app.controllers.page_controller import page_blueprint
from tourism_app.repositories.supabase_repository import SupabaseRepository
from tourism_app.services.access_key_service import AccessKeyService
from tourism_app.services.geofence_service import GeofenceService
from tourism_app.services.location_game_service import LocationGameService
from tourism_app.services.session_service import SessionService
from tourism_app.services.visitor_feedback_service import VisitorFeedbackService
from tourism_app.services.weather_service import WeatherService


def create_app(config_class=Config):
    config_class.validate()

    app = Flask(
        __name__,
        template_folder="../templates",
        static_folder="../static",
    )
    app.config.from_object(config_class)
    CORS(app, resources={r"/api/*": {"origins": "*"}})

    repository = SupabaseRepository(
        supabase_url=config_class.SUPABASE_URL,
        supabase_key=config_class.SUPABASE_KEY,
    )
    session_service = SessionService(session_ttl=config_class.SESSION_TTL)

    app.extensions["access_key_service"] = AccessKeyService(
        repository=repository,
        session_service=session_service,
        key_ttl=config_class.KEY_TTL,
        dev_access_key=config_class.DEV_ACCESS_KEY,
        enable_dev_access_key=config_class.ENABLE_DEV_ACCESS_KEY,
    )
    app.extensions["geofence_service"] = GeofenceService(
        repository=repository,
        session_service=session_service,
        radius_meter=config_class.GEOFENCE_RADIUS_METER,
    )
    app.extensions["location_game_service"] = LocationGameService(
        repository=repository,
        session_service=session_service,
        default_radius_meter=1000.0,
    )
    app.extensions["visitor_feedback_service"] = VisitorFeedbackService(
        repository=repository,
        session_service=session_service,
    )
    app.extensions["weather_service"] = WeatherService(
        timeout_seconds=config_class.WEATHER_TIMEOUT_SECONDS,
    )

    app.register_blueprint(page_blueprint)
    app.register_blueprint(api_blueprint)
    return app
