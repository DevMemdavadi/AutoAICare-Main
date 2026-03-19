import requests
import os

def get_whatsapp_access_token():
    app_id = os.environ.get('FB_APP_ID')
    app_secret = os.environ.get('FB_APP_SECRET')
    user_access_token = os.environ.get('FB_USER_ACCESS_TOKEN')  # Long-lived user token

    if not all([app_id, app_secret, user_access_token]):
        raise Exception("Facebook App credentials or user token not set in environment variables.")

    url = (
        f"https://graph.facebook.com/v19.0/oauth/access_token"
        f"?grant_type=fb_exchange_token"
        f"&client_id={app_id}"
        f"&client_secret={app_secret}"
        f"&fb_exchange_token={user_access_token}"
    )

    response = requests.get(url)
    data = response.json()
    if "access_token" in data:
        return data["access_token"]
    else:
        raise Exception(f"Failed to fetch access token: {data}")
