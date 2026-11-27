"""Operator-only recovery of the existing Mother Nature test draft."""

import getpass
import hmac
import json
import re
import sys
import time
import warnings
from decimal import Decimal
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.parse import quote, urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

PREVIEW = "https://deploy-preview-103--vudi-phothisuk-art.netlify.app"
DRAFT_ID = "75431017083608576"
DRAFT_URL = "https://api.prodigi.com/v5/orders/" + DRAFT_ID
SKU = "GLOBAL-PAP-9X12"
IDENTIFIER = re.compile(r"[A-Za-z0-9_-]{1,100}")
mutation_attempted = False


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def prompt(label):
    return getpass.getpass(label + ": ").strip()


def require(condition, message):
    if not condition:
        raise RuntimeError(message)


def signed_url(master, artwork_digest, now):
    path = "/api/studio-print/artwork/mother-nature-" + artwork_digest + ".jpg"
    # HKDF-SHA256 extract and first expansion block, matching studioConfig.
    extracted = hmac.digest(b"studio-print-launch-v1", bytes.fromhex(master), "sha256")
    key = hmac.digest(extracted, b"artwork signatures\x01", "sha256")
    expiry = str(now + 48 * 3600)
    message = f"studio-print-launch-artwork-v1\n{PREVIEW}{path}\n{expiry}".encode()
    sig = hmac.digest(key, message, "sha256").hex()
    return PREVIEW + path + "?" + urlencode({"expires": expiry, "sig": sig})


def request(label, method, url, headers, payload=None):
    body = None if payload is None else json.dumps(payload).encode()
    req = Request(url, data=body, headers=headers, method=method)
    try:
        with build_opener(NoRedirect()).open(req, timeout=30) as response:
            if method == "HEAD":
                return response.headers
            data = json.load(response)
    except HTTPError as exc:
        code = exc.code
        exc.close()
        raise RuntimeError(f"{label} returned HTTP {code}.") from None
    except (URLError, OSError, ValueError):
        raise RuntimeError(f"{label} did not return a valid response.") from None
    require(isinstance(data, dict), f"{label} returned an unexpected response.")
    return data


def money_is(money, expected):
    if not isinstance(money, dict) or money.get("currency") != "USD":
        return False
    amount = money.get("amount")
    return (isinstance(amount, str) and re.fullmatch(r"[0-9]{1,6}(?:\.[0-9]{1,2})?", amount)
            and Decimal(amount) == Decimal(expected))


def sku_of(item):
    value = item.get("sku") or item.get("catalogueVariantId")
    return value.upper() if isinstance(value, str) else None


def main():
    global mutation_attempted
    warnings.simplefilter("error", getpass.GetPassWarning)
    order_id = prompt("Verified Square order ID")
    token = prompt("Studio Print admin token")
    key = prompt("Prodigi live API key, including live_ once")
    require(IDENTIFIER.fullmatch(order_id) and re.fullmatch(r"[0-9a-fA-F]{64}", token),
            "Invalid Square order ID or admin token format.")
    require(re.fullmatch(r"live_[!-~]+", key) and not key.startswith("live_live_"),
            "Invalid Prodigi key format.")
    supplier_headers = {"X-API-Key": key, "Content-Type": "application/json"}
    order = request("Studio Print view", "POST", PREVIEW + "/api/studio-print/admin",
                    {"Authorization": "Bearer " + token, "Content-Type": "application/json"},
                    {"action": "view", "orderId": order_id})
    require(order.get("orderId") == order_id and order.get("artwork") == "mother-nature"
            and order.get("size") == "9x12" and order.get("quantity") == 1
            and order.get("paymentStatus") == "COMPLETED" and order.get("refundedCents") == 0
            and order.get("approval") == "rejected"
            and (order.get("fulfillment") or {}).get("state") == "draft"
            and order.get("amounts", {}).get("totalCents") == 6190,
            "Internal order does not match the paid, rejected Mother Nature test.")

    def draft():
        data = request("Prodigi draft lookup", "GET", DRAFT_URL, supplier_headers).get("data")
        require(isinstance(data, dict) and data.get("id") == DRAFT_ID
                and data.get("merchantReference") == order_id and data.get("status") == "draft"
                and data.get("shippingMethod") == "standard"
                and isinstance(data.get("recipient"), dict) and isinstance(data.get("items"), list)
                and all(isinstance(item, dict) for item in data["items"]),
                "Draft identity, state, shipping or response structure did not match.")
        return data

    original = draft()
    require(len(original["items"]) == 1, "Expected exactly one broken line. Inspect the existing draft.")
    broken = original["items"][0]
    old_id = broken.get("id")
    require(isinstance(old_id, str) and IDENTIFIER.fullmatch(old_id)
            and not sku_of(broken) and broken.get("quantity") == 1,
            "The original line does not match the diagnosed broken line.")
    require((original["recipient"].get("address") or {}).get("postalOrZipCode") == "15024",
            "Draft destination ZIP is not 15024.")

    master = prompt("Studio Print master key for Deploy Preview #103")
    require(re.fullmatch(r"[0-9a-fA-F]{64}", master), "Invalid master key format.")
    manifest = json.loads((Path(__file__).resolve().parent.parent /
                           "docs/studio-print-photographs.json").read_text(encoding="utf-8"))
    matching = [row["sourceSha256"] for row in manifest if row["artworkId"] == "mother-nature"]
    require(len(matching) == 1 and re.fullmatch(r"[0-9a-f]{64}", matching[0]),
            "Mother Nature master manifest entry is invalid.")
    signed_at = int(time.time())
    artwork = signed_url(master, matching[0], signed_at)
    del master
    headers = request("Preview artwork access", "HEAD", artwork, {})
    require(headers.get_content_type() == "image/jpeg" and int(headers.get("Content-Length", "0")) > 0,
            "Preview did not serve the expected private artwork metadata.")

    def verify_item(item):
        assets = item.get("assets") or []
        return (sku_of(item) == SKU and item.get("quantity") == 1 and item.get("sizing") == "fitPrintArea"
                and len(assets) == 1 and assets[0].get("printArea") == "default"
                and assets[0].get("url") == artwork)

    print(f"Verified paid Square order and matching Prodigi draft {DRAFT_ID}.")
    print("One replacement line will be added to the same draft. This does not submit it.")
    if prompt("Type ADD 75431017083608576") != "ADD 75431017083608576":
        return 1

    require(time.time() < signed_at + 24 * 3600, "Artwork URL has insufficient remaining validity.")
    require(draft() == original, "Draft changed since inspection. Stop and reconcile.")
    mutation_attempted = True
    request("Add replacement line", "POST", DRAFT_URL + "/items", supplier_headers, {
        "sku": SKU, "quantity": 1, "sizing": "fitPrintArea",
        "assets": [{"printArea": "default", "url": artwork}],
    })

    def verify_replacement(data):
        require(data["recipient"] == original["recipient"] and len(data["items"]) == 2,
                "Expected the unchanged recipient and exactly two lines after adding.")
        old = [item for item in data["items"] if item.get("id") == old_id]
        new = [item for item in data["items"] if item.get("id") != old_id]
        require(len(old) == 1 and not sku_of(old[0]) and len(new) == 1 and verify_item(new[0]),
                "Could not verify both the replacement and the exact broken line.")
        new_id = new[0].get("id")
        require(isinstance(new_id, str) and IDENTIFIER.fullmatch(new_id),
                "Replacement line ID is invalid.")
        return new_id

    replacement_id = verify_replacement(draft())
    print(f"Replacement verified. Broken line ID: {old_id}")
    if prompt("Type REMOVE " + old_id) != "REMOVE " + old_id:
        raise RuntimeError("Removal cancelled. The draft may now have two lines.")
    require(verify_replacement(draft()) == replacement_id,
            "Replacement changed since inspection. Stop and reconcile.")
    request("Remove exact broken line", "DELETE", DRAFT_URL + "/items/" + quote(old_id, safe=""),
            supplier_headers)

    repaired = draft()
    totals = repaired.get("totals") or {}
    require(repaired["recipient"] == original["recipient"] and len(repaired["items"]) == 1
            and repaired["items"][0].get("id") == replacement_id and verify_item(repaired["items"][0])
            and money_is(totals.get("items"), "13.00") and money_is(totals.get("shipping"), "12.85")
            and money_is(totals.get("tax"), "0.00") and money_is(totals.get("total"), "25.85")
            and "submit" in (repaired.get("allowedActions") or []),
            "Repaired draft did not return one verified line and the expected $25.85 USD total.")
    require(time.time() < signed_at + 24 * 3600, "Repaired draft has insufficient artwork validity for approval.")
    print(f"Draft {DRAFT_ID} verified: one {SKU} line at $25.85 USD. Still a draft.")
    return 0


if __name__ == "__main__":
    try:
        sys.exit(main())
    except (RuntimeError, KeyError, TypeError, AttributeError, ValueError,
            OSError, EOFError, getpass.GetPassWarning, KeyboardInterrupt) as exc:
        print(str(exc) if isinstance(exc, RuntimeError) else "Input or response could not be verified.",
              file=sys.stderr)
        if mutation_attempted:
            print("STOP: inspect and reconcile the existing Prodigi draft before any further write.",
                  file=sys.stderr)
        else:
            print("STOP: no draft mutation was attempted.", file=sys.stderr)
        sys.exit(1)
