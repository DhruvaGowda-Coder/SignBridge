import requests
import random

# Test static
static_data = {"landmarks": [random.random() for _ in range(63)]}
try:
    r = requests.post("http://localhost:8000/predict/static", json=static_data)
    print("Static Response:", r.json())
except Exception as e:
    print("Static Error:", e)

# Test dynamic
dynamic_data = {"sequence": [[random.random() for _ in range(63)] for _ in range(30)]}
try:
    r = requests.post("http://localhost:8000/predict/dynamic", json=dynamic_data)
    print("Dynamic Response:", r.json())
except Exception as e:
    print("Dynamic Error:", e)
