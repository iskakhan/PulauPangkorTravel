from datetime import datetime, timezone

from supabase import Client, create_client
from supabase.lib.client_options import SyncClientOptions


class SupabaseRepository:
    def __init__(self, supabase_url, supabase_key):
        self.supabase_url = supabase_url
        self.supabase_key = supabase_key
        self.client: Client = create_client(supabase_url, supabase_key)

    def get_security_key(self, access_key):
        response = (
            self.client.table("security_keys")
            .select("id, access_key, is_used, created_at")
            .eq("access_key", access_key)
            .limit(1)
            .execute()
        )
        records = response.data or []
        return records[0] if records else None

    def mark_security_key_used(self, security_key_id):
        response = (
            self.client.table("security_keys")
            .update({"is_used": True})
            .eq("id", security_key_id)
            .eq("is_used", False)
            .execute()
        )
        return bool(response.data)

    def create_visitor_session(self, session_token, access_key, visitor_name):
        response = (
            self.client.table("visitor_sessions")
            .insert(
                {
                    "session_token": session_token,
                    "access_key": access_key,
                    "visitor_name": visitor_name,
                }
            )
            .execute()
        )
        records = response.data or []
        return records[0] if records else None

    def get_visitor_session(self, session_token):
        response = (
            self.client.table("visitor_sessions")
            .select("session_token, access_key, visitor_name, created_at")
            .eq("session_token", session_token)
            .limit(1)
            .execute()
        )
        records = response.data or []
        return records[0] if records else None

    def submit_visitor_feedback(self, session_token, visit_comment, system_comment):
        response = (
            self.client.table("visitor_sessions")
            .update(
                {
                    "visit_comment": visit_comment,
                    "system_comment": system_comment,
                    "feedback_submitted_at": datetime.now(timezone.utc).isoformat(),
                }
            )
            .eq("session_token", session_token)
            .execute()
        )
        records = response.data or []
        return records[0] if records else None

    def get_destinations_in_geofence(self, longitude, latitude, radius_meter):
        response = (
            self.client.rpc(
                "semak_geofence",
                {
                    "user_long": longitude,
                    "user_lat": latitude,
                    "max_radius_meter": radius_meter,
                },
            )
            .execute()
        )
        return response.data or []

    def list_active_locations(self):
        response = (
            self.client.table("locations")
            .select("*")
            .eq("is_active", True)
            .execute()
        )
        records = response.data or []

        try:
            destination_response = self.client.table("destinasi").select("*").execute()
            destinations = destination_response.data or []
        except Exception:
            destinations = []

        destinations_by_location_id = {
            str(destination.get("location_id")): destination
            for destination in destinations
            if destination.get("location_id") not in (None, "")
        }
        destinations_by_id = {
            str(destination.get("id")): destination
            for destination in destinations
            if destination.get("id") not in (None, "")
        }

        for record in records:
            location_id = str(record.get("id") or record.get("location_id") or "")
            destination_id = str(
                record.get("destinasi_id")
                or record.get("destination_id")
                or ""
            )
            dest_item = (
                destinations_by_location_id.get(location_id)
                or destinations_by_id.get(destination_id)
                or _first_related_record(record.get("destinasi"))
            )

            if dest_item:
                record["destinasi"] = dest_item
                record["featured_image_url"] = (
                    dest_item.get("featured_image_url")
                    or record.get("featured_image_url")
                )
                record["banner_image_url"] = (
                    dest_item.get("banner_image_url")
                    or record.get("banner_image_url")
                )
            record["image_url"] = (
                record.get("featured_image_url")
                or record.get("banner_image_url")
                or _first_image(record.get("senarai_gambar"))
                or _first_image(dest_item.get("senarai_gambar") if dest_item else None)
            )
        return records

    def get_nearby_locations(self, latitude, longitude, max_distance_meter):
        response = (
            self.client.rpc(
                "get_nearby_locations",
                {
                    "user_lat": latitude,
                    "user_lng": longitude,
                    "max_distance_m": max_distance_meter,
                },
            )
            .execute()
        )
        return response.data or []

    def check_in_location(self, location_id, latitude, longitude, auth_token=None):
        client = self._client_for_auth_token(auth_token)
        response = (
            client.rpc(
                "check_in_location",
                {
                    "p_location_id": location_id,
                    "p_user_lat": latitude,
                    "p_user_lng": longitude,
                },
            )
            .execute()
        )
        return response.data

    def _client_for_auth_token(self, auth_token):
        if not auth_token:
            return self.client

        return create_client(
            self.supabase_url,
            self.supabase_key,
            SyncClientOptions(headers={"Authorization": f"Bearer {auth_token}"}),
        )

    def get_location(self, location_id):
        return self._get_single_record("locations", location_id)

    def get_location_media(self, location_id):
        response = (
            self.client.table("location_media")
            .select("*")
            .eq("location_id", location_id)
            .execute()
        )
        return response.data or []

    def get_location_card(self, location_id):
        return self._get_single_related_record("location_cards", location_id)

    def get_destinasi_for_location(self, location_id):
        return self._get_single_related_record("destinasi", location_id)

    def _get_single_record(self, table_name, record_id):
        response = (
            self.client.table(table_name)
            .select("*")
            .eq("id", record_id)
            .limit(1)
            .execute()
        )
        records = response.data or []
        return records[0] if records else None

    def _get_single_related_record(self, table_name, location_id):
        response = (
            self.client.table(table_name)
            .select("*")
            .eq("location_id", location_id)
            .limit(1)
            .execute()
        )
        records = response.data or []
        return records[0] if records else None

    def list_social_media_links(self):
        response = (
            self.client.table("social_media_links")
            .select("*")
            .eq("is_active", True)
            .execute()
        )
        return response.data or []


def _first_related_record(value):
    if isinstance(value, dict):
        return value
    if isinstance(value, list):
        return next((item for item in value if isinstance(item, dict)), None)
    return None


def _first_image(value):
    if isinstance(value, list):
        return next((item for item in value if item), None)
    return value or None
