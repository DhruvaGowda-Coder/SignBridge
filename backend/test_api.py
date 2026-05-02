import requests
import random

# Test static
static_data = {"landmarks": [random.random() for _ in range(63)]}
try:
    r = requests.post("http://localhost:8000/predict/static", json=static_data)
    print("Static Response:", r.json())
except Exception as e:
    print("Static Error:", e)
