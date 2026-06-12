from flask import Blueprint, current_app, jsonify, request

from tourism_app.services.errors import AppError

api_blueprint = Blueprint("api", __name__, url_prefix="/api")


def _json_error(message, status_code):
    return jsonify({"error": message}), status_code


@api_blueprint.errorhandler(AppError)
def handle_app_error(error):
    return _json_error(error.message, error.status_code)


@api_blueprint.post("/verify-key")
def verify_key():
    data = request.get_json(silent=True) or {}
    access_key = (data.get("access_key") or "").strip()
    visitor_name = (data.get("visitor_name") or "").strip()

    service = current_app.extensions["access_key_service"]
    result = service.verify(access_key, visitor_name=visitor_name)
    return jsonify(result)


@api_blueprint.post("/session-status")
def session_status():
    data = request.get_json(silent=True) or {}
    session_token = (data.get("session_token") or "").strip()

    service = current_app.extensions["access_key_service"]
    return jsonify(service.validate_session(session_token))


@api_blueprint.get("/app-config")
def app_config():
    demo_access_key = None
    if current_app.config.get("ENABLE_DEV_ACCESS_KEY"):
        demo_access_key = current_app.config.get("DEV_ACCESS_KEY")

    return jsonify(
        {
            "demo_access_key": demo_access_key,
            "mapbox_access_token": current_app.config.get("MAPBOX_ACCESS_TOKEN") or "",
            "mapbox_style_url": current_app.config.get("MAPBOX_STYLE_URL") or "mapbox://styles/mapbox/streets-v12",
        }
    )


@api_blueprint.post("/check-location")
def check_location():
    data = request.get_json(silent=True) or {}

    service = current_app.extensions["geofence_service"]
    destinations = service.check_location(data)
    return jsonify({"destinasi": destinations})


@api_blueprint.get("/locations")
def locations():
    service = current_app.extensions["location_game_service"]
    response = jsonify({"locations": service.list_active_locations()})
    response.headers["Cache-Control"] = "no-store, no-cache, must-revalidate, max-age=0"
    return response


@api_blueprint.get("/social-media")
def social_media():
    service = current_app.extensions["location_game_service"]
    return jsonify({"social_media_links": service.list_social_media_links()})


@api_blueprint.post("/nearby-locations")
def nearby_locations():
    data = request.get_json(silent=True) or {}

    service = current_app.extensions["location_game_service"]
    nearby = service.get_nearby_locations(data)
    return jsonify({"locations": nearby})


@api_blueprint.post("/location-detail")
def location_detail():
    data = request.get_json(silent=True) or {}

    service = current_app.extensions["location_game_service"]
    return jsonify(service.get_location_detail(data))


@api_blueprint.post("/check-in-location")
def check_in_location():
    data = request.get_json(silent=True) or {}
    auth_token = _bearer_token(request.headers.get("Authorization"))

    service = current_app.extensions["location_game_service"]
    return jsonify({"visit": service.check_in_location(data, auth_token=auth_token)})


@api_blueprint.post("/visitor-feedback")
def visitor_feedback():
    data = request.get_json(silent=True) or {}

    service = current_app.extensions["visitor_feedback_service"]
    return jsonify(service.submit_feedback(data))


@api_blueprint.get("/weather")
def weather():
    service = current_app.extensions["weather_service"]
    return jsonify(
        service.get_current_weather(
            {
                "latitude": request.args.get("latitude"),
                "longitude": request.args.get("longitude"),
            }
        )
    )


def _bearer_token(authorization_header):
    if not authorization_header:
        return None

    scheme, _, token = authorization_header.partition(" ")
    if scheme.lower() != "bearer" or not token:
        return None

    return token.strip()
