import requests
FIREBASE_URL = "https://caldas-d4fa9-default-rtdb.firebaseio.com"

try:
    url = f"{FIREBASE_URL}/lecturas/2026-05-10.json?orderBy=\"$key\"&limitToLast=10"
    resp_day = requests.get(url, timeout=10)
    print(f"Status:", resp_day.status_code)
    print(f"Response snippet:", str(resp_day.text)[:100])
except Exception as e:
    print("Exception:", e)
