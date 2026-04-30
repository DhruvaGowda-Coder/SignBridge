import urllib.request
import urllib.error

url = 'http://localhost:8000/predict/static'
data = b'{"landmarks": ' + b'[0.0]*63' + b'}'
# properly format the json
data = b'{"landmarks": [' + b','.join([b'0.0']*63) + b']}'
headers = {'Content-Type': 'application/json', 'Origin': 'http://localhost:3000'}

for i in range(3005):
    req = urllib.request.Request(url, data=data, headers=headers, method='POST')
    try:
        urllib.request.urlopen(req)
    except urllib.error.HTTPError as e:
        print(f"Hit {e.code} on request {i}")
        print("Response Headers:")
        print(e.headers)
        break
