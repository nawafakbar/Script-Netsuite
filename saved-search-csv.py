import requests
import os
from requests_oauthlib import OAuth1
from datetime import datetime
tanggal_hari_ini = datetime.now().strftime("%Y-%m-%d")
full_path = rf'D:\BackupNetsuite\budget_number_{tanggal_hari_ini}.csv'
credentials = { 'account': '8515496-sb1', 'consumer_key': 'd43d0184b344d30564ebfb23d2cab30e905310232bdf97764071af0115590463', 'consumer_secret': '3844bcedd120436eb91ff45368abcfc2d4e13d97e04241e4f50804f86bf2d3a1', 'token_id': 'd09c9c6e9398fd8fb92907326716dd200eb548f3f177470901562ef8774c7013', 'token_secret': 'e916b9917205bfffa8018c72b0da8c03a864cca27c7df0b1cd21e8738ad47e56', 'realm': '8515496_SB1' }
url = ""
end = 0
for i in range(100):
    if i >= 1:
        end = end + 1000
        url = f"https://8515496-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=1583&deploy=1&end={end}"
        print("test 1")
    else:
        print("test 2")
        url = "https://8515496-sb1.restlets.api.netsuite.com/app/site/hosting/restlet.nl?script=1583&deploy=1"
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