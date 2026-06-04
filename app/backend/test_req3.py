import sys
import json
import traceback

sys.path.append('.')
from app import load_all_history
import req3_engine

try:
    history = load_all_history()
    analysis = req3_engine.generate_req3_analysis(history)
    print("STATUS:", analysis.get('status'))
    if analysis.get('status') == 'error':
        print(analysis)
    else:
        json.dumps(analysis) # Test json serialization
        print("SUCCESS")
except Exception as e:
    traceback.print_exc()
