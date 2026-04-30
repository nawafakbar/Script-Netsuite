import requests
import os
from requests_oauthlib import OAuth1
from datetime import datetime
tanggal_hari_ini = datetime.now().strftime("%Y-%m-%d")
full_path = rf'D:\BackupNetsuite\budget_number_{tanggal_hari_ini}.csv'
credentials = { 'account': 'xxxxx', 'consumer_key': 'xxxxxx', 'consumer_secret': 'xxxxxx', 'token_id': 'xxxxxx', 'token_secret': 'xxxxxxx', 'realm': 'xxxxx' }
url = ""
end = 0
for i in range(100):
    if i >= 1:
        end = end + 1000
        url = f"https://xxxxxx&deploy=1&end={end}"
        print("test 1")
    else:
        print("test 2")
        url = "https://xxxxxx&deploy=1"
    print(f"url : {url}")
    auth = OAuth1(credentials['consumer_key'], credentials['consumer_secret'], credentials['token_id'], credentials['token_secret'], signature_method='HMAC-SHA256', realm=credentials['realm'])
    response = requests.get(url, auth=auth)
    print(f"response : {response}")
    if response.status_code == 200:
        if response.text:
            csv_data = response.text
            print(f"data: {response.text}")
            file_exists = os.path.isfile(full_path)
            with open(full_path, 'a', encoding='utf-8', newline='') as f:
                if not file_exists:
                    f.write(csv_data)
                else:
                    data_tanpa_header = "\n".join(csv_data.splitlines()[1:])
                    f.write("\n" + data_tanpa_header)
            print(f"File CSV berhasil dibuat di: {full_path}")
        else:
            break
    else:
        print(f"Gagal: {response.status_code}")
        break