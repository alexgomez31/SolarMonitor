import sys
import os

sys.path.append(os.path.abspath('app/backend'))

from app import app, get_history

with app.app_context():
    resp = get_history()
    print("Status:", resp.status_code)
    print("Data len:", len(resp.json))
    if len(resp.json) > 0:
        print("First item:", resp.json[0])
