import requests

r = requests.get("http://localhost:5000/api/ai-analysis")
print("Status:", r.status_code)
if r.status_code != 200:
    print(r.text)
