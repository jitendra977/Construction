import os
import sys

try:
    from google_auth_oauthlib.flow import InstalledAppFlow
except ImportError:
    print("Please install google-auth-oauthlib first:")
    print("pip install google-auth-oauthlib")
    sys.exit(1)

# The OAuth 2.0 scope required to upload files to Google Drive
SCOPES = ['https://www.googleapis.com/auth/drive.file']

def main():
    print("="*60)
    print("🚀 Google Drive Refresh Token Generator")
    print("="*60)
    print("\nBefore proceeding, you need your CLIENT_ID and CLIENT_SECRET.")
    client_id = input("Enter your Google Client ID: ").strip()
    client_secret = input("Enter your Google Client Secret: ").strip()

    if not client_id or not client_secret:
        print("❌ Error: Client ID and Client Secret are required.")
        sys.exit(1)

    client_config = {
        "installed": {
            "client_id": client_id,
            "client_secret": client_secret,
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
            "redirect_uris": ["http://localhost"]
        }
    }

    try:
        print("\n⏳ Opening your browser... Please log in with your 5TB Google account.")
        flow = InstalledAppFlow.from_client_config(client_config, SCOPES)
        credentials = flow.run_local_server(port=0)

        print("\n✅ SUCCESS! Authentication complete.")
        print("="*60)
        print("Please copy the following values into your .env file:\n")
        print(f"GOOGLE_DRIVE_CLIENT_ID={client_id}")
        print(f"GOOGLE_DRIVE_CLIENT_SECRET={client_secret}")
        print(f"GOOGLE_DRIVE_REFRESH_TOKEN={credentials.refresh_token}")
        print("="*60)
        print("\nNote: Keep these credentials secret. Do not share them.")
        
    except Exception as e:
        print(f"\n❌ Error during authentication: {e}")

if __name__ == '__main__':
    main()
