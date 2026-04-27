"""
NetSuite Backup via RESTlet
Menggunakan OAuth signature manual persis seperti Laravel NetSuiteService
"""

import os
import csv
import json
import time
import hmac
import hashlib
import base64
import shutil
import logging
import zipfile
import secrets
import argparse
import configparser
from datetime import datetime, timedelta
from pathlib import Path
from urllib.parse import quote, urlencode

import requests

# ─── Logging ──────────────────────────────────────────────────────────────────

def setup_logging(log_dir: Path) -> logging.Logger:
    log_dir.mkdir(parents=True, exist_ok=True)
    log_file = log_dir / f"backup_{datetime.now().strftime('%Y-%m-%d')}.log"
    logger = logging.getLogger("netsuite_backup")
    logger.setLevel(logging.DEBUG)
    fmt = logging.Formatter("[%(asctime)s] %(levelname)-8s %(message)s", "%Y-%m-%d %H:%M:%S")
    fh = logging.FileHandler(log_file, encoding="utf-8")
    fh.setLevel(logging.DEBUG)
    fh.setFormatter(fmt)
    ch = logging.StreamHandler()
    ch.setLevel(logging.INFO)
    ch.setFormatter(fmt)
    logger.addHandler(fh)
    logger.addHandler(ch)
    return logger

def load_config(config_path: str = "config.ini") -> configparser.ConfigParser:
    config = configparser.ConfigParser()
    if not os.path.exists(config_path):
        raise FileNotFoundError(f"File config tidak ditemukan: {config_path}")
    config.read(config_path, encoding="utf-8")
    return config

# ─── OAuth Manual (persis seperti Laravel) ────────────────────────────────────

def rfc3986_encode(value: str) -> str:
    return quote(str(value), safe='')

def generate_auth_header(method, clean_url, account_id, consumer_key, consumer_secret,
                          token_id, token_secret, script_id, deploy_id, extra_params=None):
    """
    Generate OAuth header persis seperti Laravel NetSuiteService->generateAuthHeader()
    """
    nonce     = secrets.token_hex(16)
    timestamp = str(int(time.time()))

    oauth_params = {
        'oauth_consumer_key':     consumer_key,
        'oauth_nonce':            nonce,
        'oauth_signature_method': 'HMAC-SHA256',
        'oauth_timestamp':        timestamp,
        'oauth_token':            token_id,
        'oauth_version':          '1.0',
    }

    base_params = {
        'script': script_id,
        'deploy': deploy_id,
    }

    all_params = {**oauth_params, **base_params, **(extra_params or {})}
    all_params = dict(sorted(all_params.items()))

    # Build parameter string (RFC3986)
    param_parts = []
    for k, v in all_params.items():
        param_parts.append(f"{rfc3986_encode(k)}={rfc3986_encode(v)}")
    param_string = '&'.join(param_parts)

    # Base string
    base_string = (
        method.upper() + '&' +
        rfc3986_encode(clean_url) + '&' +
        rfc3986_encode(param_string)
    )

    # Signing key
    signing_key = rfc3986_encode(consumer_secret) + '&' + rfc3986_encode(token_secret)

    # Signature
    signature = base64.b64encode(
        hmac.new(signing_key.encode('utf-8'), base_string.encode('utf-8'), hashlib.sha256).digest()
    ).decode('utf-8')

    oauth_params['oauth_signature'] = signature
    oauth_params['realm']           = account_id.upper()

    # Build header string
    header_parts = []
    for k, v in oauth_params.items():
        header_parts.append(f'{k}="{rfc3986_encode(v)}"')

    return 'OAuth ' + ', '.join(header_parts)


# ─── NetSuite RESTlet Client ──────────────────────────────────────────────────

class NetSuiteRESTlet:
    def __init__(self, account_id, consumer_key, consumer_secret, token_id, token_secret, script_id, deploy_id):
        self.account_id      = account_id.lower()
        self.consumer_key    = consumer_key
        self.consumer_secret = consumer_secret
        self.token_id        = token_id
        self.token_secret    = token_secret
        self.script_id       = script_id
        self.deploy_id       = deploy_id
        self.clean_url       = f"https://{self.account_id}.restlets.api.netsuite.com/app/site/hosting/restlet.nl"
        self.base_url        = f"{self.clean_url}?script={script_id}&deploy={deploy_id}"

    def get(self, record_type: str, record_id: str = None) -> dict:
        extra_params = {'type': record_type}
        if record_id:
            extra_params['id'] = str(record_id)

        auth_header = generate_auth_header(
            method        = 'GET',
            clean_url     = self.clean_url,
            account_id    = self.account_id,
            consumer_key  = self.consumer_key,
            consumer_secret = self.consumer_secret,
            token_id      = self.token_id,
            token_secret  = self.token_secret,
            script_id     = self.script_id,
            deploy_id     = self.deploy_id,
            extra_params  = extra_params,
        )

        # Build URL dengan semua params
        url = self.base_url
        for k, v in extra_params.items():
            url += f"&{k}={v}"

        resp = requests.get(url, headers={
            'Authorization': auth_header,
            'Content-Type': 'application/json',
        }, timeout=120)
        resp.raise_for_status()
        return resp.json()

    def test_connection(self) -> bool:
        try:
            result = self.get("customer")
            if isinstance(result, dict) and "error" in result:
                raise Exception(result["error"])
            return True
        except Exception as e:
            raise ConnectionError(f"{e}")


# ─── Export CSV ───────────────────────────────────────────────────────────────

def export_to_csv(data: list, filepath: Path, logger: logging.Logger) -> int:
    if not data:
        logger.warning(f"  Tidak ada data untuk {filepath.name}, dilewati.")
        return 0
    flat_data = []
    for row in data:
        if isinstance(row, dict):
            flat_row = {k: (json.dumps(v, ensure_ascii=False) if isinstance(v, (dict, list)) else v)
                        for k, v in row.items()}
            flat_data.append(flat_row)
    with open(filepath, "w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=flat_data[0].keys())
        writer.writeheader()
        writer.writerows(flat_data)
    return len(flat_data)

def compress_folder(folder: Path, logger: logging.Logger) -> Path:
    zip_path = folder.parent / f"{folder.name}.zip"
    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zf:
        for file in folder.glob("*"):
            zf.write(file, arcname=file.name)
    logger.info(f"Compressed ke: {zip_path}")
    shutil.rmtree(folder)
    return zip_path

def cleanup_old_backups(output_dir: Path, retention_days: int, logger: logging.Logger):
    if retention_days <= 0:
        return
    cutoff = datetime.now() - timedelta(days=retention_days)
    for item in output_dir.iterdir():
        if not item.name.startswith("netsuite_"):
            continue
        try:
            item_date = datetime.strptime(item.name[9:19], "%Y-%m-%d")
            if item_date < cutoff:
                shutil.rmtree(item) if item.is_dir() else item.unlink()
                logger.info(f"Dihapus: {item.name}")
        except ValueError:
            continue

# ─── Daftar backup ────────────────────────────────────────────────────────────

BACKUP_TYPES = [
    ("customers",       "customer"),
    ("employees",       "employee"),
    ("departments",     "department"),
    ("projects",        "project"),
    ("sales_orders",    "salesorder"),
    ("purchase_orders", "purchaseorder"),
]

# ─── Main ─────────────────────────────────────────────────────────────────────

def run_backup(config_path: str = "config.ini", test_only: bool = False):
    config = load_config(config_path)

    output_dir = Path(config.get("backup", "output_dir", fallback="/tmp/NetSuiteBackup"))
    date_str   = datetime.now().strftime("%Y-%m-%d_%H-%M-%S")
    today_dir  = output_dir / f"netsuite_{date_str}"
    log_dir    = output_dir / "logs"

    logger = setup_logging(log_dir)
    logger.info("=" * 60)
    logger.info("NetSuite Backup (RESTlet) dimulai")
    logger.info(f"Output: {today_dir}")
    logger.info("=" * 60)

    client = NetSuiteRESTlet(
        account_id      = config.get("netsuite", "account_id"),
        consumer_key    = config.get("netsuite", "consumer_key"),
        consumer_secret = config.get("netsuite", "consumer_secret"),
        token_id        = config.get("netsuite", "token_key"),
        token_secret    = config.get("netsuite", "token_secret"),
        script_id       = config.get("netsuite", "script_id"),
        deploy_id       = config.get("netsuite", "deploy_id"),
    )

    logger.info("Mengecek koneksi ke NetSuite RESTlet...")
    try:
        client.test_connection()
        logger.info("Koneksi berhasil!")
    except Exception as e:
        logger.error(f"Koneksi gagal: {e}")
        import sys; sys.exit(1)

    if test_only:
        logger.info("Mode test selesai.")
        return

    today_dir.mkdir(parents=True, exist_ok=True)
    summary = {"started_at": datetime.now().isoformat(), "files": [], "total_rows": 0, "errors": []}

    for filename, record_type in BACKUP_TYPES:
        logger.info(f"Backup: {record_type} ...")
        try:
            result = client.get(record_type)
            if isinstance(result, dict) and "error" in result:
                raise Exception(result["error"])
            data = result.get("data", [])
            csv_path = today_dir / f"{filename}.csv"
            count = export_to_csv(data, csv_path, logger)
            logger.info(f"  Selesai: {count:,} baris -> {csv_path.name}")
            summary["files"].append({"name": filename, "rows": count})
            summary["total_rows"] += count
        except Exception as e:
            logger.error(f"  GAGAL backup {record_type}: {e}")
            summary["errors"].append({"name": record_type, "error": str(e)})
        time.sleep(0.5)

    summary["finished_at"] = datetime.now().isoformat()
    with open(today_dir / "backup_summary.json", "w", encoding="utf-8") as f:
        json.dump(summary, f, indent=2, ensure_ascii=False)

    compress = config.getboolean("backup", "compress", fallback=True)
    if compress:
        compress_folder(today_dir, logger)

    retention = config.getint("backup", "retention_days", fallback=30)
    cleanup_old_backups(output_dir, retention, logger)

    logger.info("=" * 60)
    logger.info("Backup selesai!")
    logger.info(f"  Total file  : {len(summary['files'])}")
    logger.info(f"  Total baris : {summary['total_rows']:,}")
    if summary["errors"]:
        logger.warning(f"  Error       : {len(summary['errors'])} tipe gagal")
        for err in summary["errors"]:
            logger.warning(f"    - {err['name']}: {err['error']}")
    logger.info("=" * 60)

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="NetSuite Backup via RESTlet")
    parser.add_argument("--config", default="config.ini", help="Path ke config.ini")
    parser.add_argument("--test", action="store_true", help="Test koneksi saja")
    args = parser.parse_args()
    run_backup(config_path=args.config, test_only=args.test)