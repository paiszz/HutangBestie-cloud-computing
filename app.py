import copy
import json
import os
from datetime import datetime
from flask import Flask, jsonify, render_template, request

app = Flask(__name__)

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

# Hardcoded JSON/Dictionary initial data (No database, per course requirement)
DEFAULT_DATA = {
    "friends": [
        {
            "id": 1,
            "name": "Budi Santoso",
            "nickname": "Budi Kopi",
            "phone": "081234567890",
        },
        {
            "id": 2,
            "name": "Andi Pratama",
            "nickname": "Andi Ongkir",
            "phone": "082198765432",
        },
        {
            "id": 3,
            "name": "Siti Rahma",
            "nickname": "Siti Bioskop",
            "phone": "085611223344",
        },
    ],
    "debts": [
        {
            "id": 1,
            "friend_id": 1,
            "amount": 50000,
            "description": "Talangin Kopi Kenangan + Roti",
            "date": "2026-11-20",
            "status": "Belum Lunas",
        },
        {
            "id": 2,
            "friend_id": 2,
            "amount": 150000,
            "description": "Patungan Ongkir & Makan Siang",
            "date": "2026-11-22",
            "status": "Belum Lunas",
        },
        {
            "id": 3,
            "friend_id": 1,
            "amount": 35000,
            "description": "Parkir & Es Teh Kampus",
            "date": "2026-11-24",
            "status": "Belum Lunas",
        },
        {
            "id": 4,
            "friend_id": 3,
            "amount": 100000,
            "description": "Tiket Nonton Bioskop",
            "date": "2026-11-18",
            "status": "Lunas",
        },
    ],
    "reminders": [
        {
            "id": 1,
            "friend_id": 1,
            "debt_id": 1,
            "message_template": "Halo Budi Kopi, izin mengingatkan talangan Kopi Kenangan + Roti sebesar Rp 50.000 ya. Makasih bestie!",
            "sent_date": "2026-11-25",
        }
    ],
    "next_id": {
        "friends": 4,
        "debts": 5,
        "reminders": 2,
    },
}


def load_data():
    if os.path.exists(DATA_FILE):
        with open(DATA_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    data = copy.deepcopy(DEFAULT_DATA)
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
    return data


def save_data():
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(DATA_STORE, f, indent=2, ensure_ascii=False)


DATA_STORE = load_data()


def find_by_id(collection_name, item_id):
    return next((item for item in DATA_STORE[collection_name] if item["id"] == item_id), None)


def get_friend_totals(friend_id):
    unpaid = [d for d in DATA_STORE["debts"] if d["friend_id"] == friend_id and d["status"] != "Lunas"]
    return {
        "total_unpaid": sum(d["amount"] for d in unpaid),
        "unpaid_count": len(unpaid),
    }


def format_idr(amount):
    return f"Rp {amount:,.0f}".replace(",", ".")


@app.route("/")
def index():
    return render_template("index.html")


@app.route("/api/summary", methods=["GET"])
def get_summary():
    unpaid_debts = [d for d in DATA_STORE["debts"] if d["status"] != "Lunas"]
    paid_debts = [d for d in DATA_STORE["debts"] if d["status"] == "Lunas"]
    friends_with_unpaid = {d["friend_id"] for d in unpaid_debts}
    return jsonify({
        "total_piutang": sum(d["amount"] for d in unpaid_debts),
        "friends_unpaid_count": len(friends_with_unpaid),
        "paid_count": len(paid_debts),
        "unpaid_count": len(unpaid_debts),
        "total_friends": len(DATA_STORE["friends"]),
        "total_reminders": len(DATA_STORE["reminders"]),
    })


# -------------------- FRIENDS CRUD --------------------
@app.route("/api/friends", methods=["GET"])
def list_friends():
    enriched = []
    for f in DATA_STORE["friends"]:
        totals = get_friend_totals(f["id"])
        enriched.append({**f, **totals})
    return jsonify(enriched)


@app.route("/api/friends", methods=["POST"])
def create_friend():
    payload = request.get_json(silent=True) or {}
    name = (payload.get("name") or "").strip()
    if not name:
        return jsonify({"error": "Nama teman wajib diisi"}), 400

    new_id = DATA_STORE["next_id"]["friends"]
    DATA_STORE["next_id"]["friends"] += 1
    friend = {
        "id": new_id,
        "name": name,
        "nickname": (payload.get("nickname") or name.split()[0]).strip(),
        "phone": (payload.get("phone") or "-").strip(),
    }
    DATA_STORE["friends"].append(friend)
    save_data()
    return jsonify({**friend, **get_friend_totals(new_id)}), 201


@app.route("/api/friends/<int:friend_id>", methods=["PUT"])
def update_friend(friend_id):
    friend = find_by_id("friends", friend_id)
    if not friend:
        return jsonify({"error": "Teman tidak ditemukan"}), 404

    payload = request.get_json(silent=True) or {}
    if "name" in payload and payload["name"].strip():
        friend["name"] = payload["name"].strip()
    if "nickname" in payload:
        friend["nickname"] = payload["nickname"].strip() or friend["name"].split()[0]
    if "phone" in payload:
        friend["phone"] = payload["phone"].strip() or "-"
    save_data()
    return jsonify({**friend, **get_friend_totals(friend_id)})


@app.route("/api/friends/<int:friend_id>", methods=["DELETE"])
def delete_friend(friend_id):
    friend = find_by_id("friends", friend_id)
    if not friend:
        return jsonify({"error": "Teman tidak ditemukan"}), 404

    DATA_STORE["friends"] = [f for f in DATA_STORE["friends"] if f["id"] != friend_id]
    DATA_STORE["debts"] = [d for d in DATA_STORE["debts"] if d["friend_id"] != friend_id]
    DATA_STORE["reminders"] = [r for r in DATA_STORE["reminders"] if r["friend_id"] != friend_id]
    save_data()
    return jsonify({"message": "Teman beserta catatan terkait berhasil dihapus"})


# -------------------- DEBTS CRUD (+ Multi-Entity) --------------------
@app.route("/api/debts", methods=["GET"])
def list_debts():
    enriched = []
    for d in DATA_STORE["debts"]:
        friend = find_by_id("friends", d["friend_id"])
        enriched.append({
            **d,
            "friend_name": friend["name"] if friend else "Unknown",
            "friend_nickname": friend["nickname"] if friend else "-",
        })
    return jsonify(enriched)


@app.route("/api/debts", methods=["POST"])
def create_debt():
    payload = request.get_json(silent=True) or {}
    try:
        friend_id = int(payload.get("friend_id"))
        amount = int(payload.get("amount"))
    except (TypeError, ValueError):
        return jsonify({"error": "friend_id dan amount harus berupa angka valid"}), 400

    friend = find_by_id("friends", friend_id)
    if not friend:
        return jsonify({"error": "Teman tidak ditemukan"}), 404
    if amount <= 0:
        return jsonify({"error": "Nominal utang harus lebih dari 0"}), 400

    description = (payload.get("description") or "").strip()
    if not description:
        return jsonify({"error": "Keterangan utang wajib diisi"}), 400

    new_id = DATA_STORE["next_id"]["debts"]
    DATA_STORE["next_id"]["debts"] += 1
    debt = {
        "id": new_id,
        "friend_id": friend_id,
        "amount": amount,
        "description": description,
        "date": (payload.get("date") or datetime.now().strftime("%Y-%m-%d")).strip(),
        "status": payload.get("status") if payload.get("status") in ("Belum Lunas", "Lunas") else "Belum Lunas",
    }
    DATA_STORE["debts"].append(debt)
    save_data()
    return jsonify({
        **debt,
        "friend_name": friend["name"],
        "friend_nickname": friend["nickname"],
        "friend_totals": get_friend_totals(friend_id),
    }), 201


@app.route("/api/debts/<int:debt_id>", methods=["PUT"])
def update_debt(debt_id):
    debt = find_by_id("debts", debt_id)
    if not debt:
        return jsonify({"error": "Catatan utang tidak ditemukan"}), 404

    payload = request.get_json(silent=True) or {}
    if "friend_id" in payload:
        try:
            fid = int(payload["friend_id"])
            if not find_by_id("friends", fid):
                return jsonify({"error": "Teman tidak ditemukan"}), 404
            debt["friend_id"] = fid
        except (TypeError, ValueError):
            return jsonify({"error": "friend_id tidak valid"}), 400
    if "amount" in payload:
        try:
            amt = int(payload["amount"])
            if amt <= 0:
                return jsonify({"error": "Nominal harus lebih dari 0"}), 400
            debt["amount"] = amt
        except (TypeError, ValueError):
            return jsonify({"error": "Nominal tidak valid"}), 400
    if "description" in payload and payload["description"].strip():
        debt["description"] = payload["description"].strip()
    if "date" in payload and payload["date"].strip():
        debt["date"] = payload["date"].strip()
    if "status" in payload and payload["status"] in ("Belum Lunas", "Lunas"):
        debt["status"] = payload["status"]

    friend = find_by_id("friends", debt["friend_id"])
    save_data()
    return jsonify({
        **debt,
        "friend_name": friend["name"] if friend else "Unknown",
        "friend_nickname": friend["nickname"] if friend else "-",
    })


@app.route("/api/debts/<int:debt_id>/settle", methods=["POST"])
def settle_debt(debt_id):
    debt = find_by_id("debts", debt_id)
    if not debt:
        return jsonify({"error": "Catatan utang tidak ditemukan"}), 404
    debt["status"] = "Lunas"
    save_data()
    friend = find_by_id("friends", debt["friend_id"])
    save_data()
    return jsonify({
        **debt,
        "friend_name": friend["name"] if friend else "Unknown",
        "friend_totals": get_friend_totals(debt["friend_id"]),
    })


@app.route("/api/debts/<int:debt_id>", methods=["DELETE"])
def delete_debt(debt_id):
    debt = find_by_id("debts", debt_id)
    if not debt:
        return jsonify({"error": "Catatan utang tidak ditemukan"}), 404
    DATA_STORE["debts"] = [d for d in DATA_STORE["debts"] if d["id"] != debt_id]
    DATA_STORE["reminders"] = [r for r in DATA_STORE["reminders"] if r["debt_id"] != debt_id]
    save_data()
    return jsonify({"message": "Catatan utang berhasil dihapus"})


# -------------------- REMINDERS CRUD (+ Multi-Entity: Friends + Debts + Reminders) --------------------
@app.route("/api/reminders", methods=["GET"])
def list_reminders():
    enriched = []
    for r in DATA_STORE["reminders"]:
        friend = find_by_id("friends", r["friend_id"])
        debt = find_by_id("debts", r["debt_id"])
        enriched.append({
            **r,
            "friend_name": friend["name"] if friend else "Unknown",
            "debt_description": debt["description"] if debt else "-",
            "debt_amount": debt["amount"] if debt else 0,
        })
    return jsonify(enriched)


@app.route("/api/reminders/generate", methods=["POST"])
def generate_reminder():
    payload = request.get_json(silent=True) or {}
    try:
        debt_id = int(payload.get("debt_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "debt_id tidak valid"}), 400

    debt = find_by_id("debts", debt_id)
    if not debt:
        return jsonify({"error": "Catatan utang tidak ditemukan"}), 404
    friend = find_by_id("friends", debt["friend_id"])
    if not friend:
        return jsonify({"error": "Teman tidak ditemukan"}), 404

    tone = payload.get("tone", "santai")
    amt_str = format_idr(debt["amount"])
    nickname = friend["nickname"] or friend["name"]

    if tone == "halus":
        msg = f"Permisi {nickname}, maaf mengganggu. Mau mengingatkan soal {debt['description']} sebesar {amt_str} ya. Kapan-kapan kalau sudah sempat boleh ditransfer. Terima kasih!"
    elif tone == "pantun":
        msg = f"Beli bakwan di pinggir kali, makannya bareng si {nickname}. Utang {debt['description']} {amt_str} jangan lupa dibayar ya bestie, biar silaturahmi tetap berseri!"
    else:
        msg = f"Halo {nickname}, izin mengingatkan talangan {debt['description']} sebesar {amt_str} ya. Makasih bestie!"

    return jsonify({
        "friend_id": friend["id"],
        "debt_id": debt["id"],
        "friend_name": friend["name"],
        "message_template": msg,
    })


@app.route("/api/reminders", methods=["POST"])
def create_reminder():
    payload = request.get_json(silent=True) or {}
    try:
        friend_id = int(payload.get("friend_id"))
        debt_id = int(payload.get("debt_id"))
    except (TypeError, ValueError):
        return jsonify({"error": "friend_id dan debt_id harus valid"}), 400

    if not find_by_id("friends", friend_id) or not find_by_id("debts", debt_id):
        return jsonify({"error": "Teman atau catatan utang tidak ditemukan"}), 404

    message_template = (payload.get("message_template") or "").strip()
    if not message_template:
        return jsonify({"error": "Isi pesan pengingat wajib diisi"}), 400

    new_id = DATA_STORE["next_id"]["reminders"]
    DATA_STORE["next_id"]["reminders"] += 1
    reminder = {
        "id": new_id,
        "friend_id": friend_id,
        "debt_id": debt_id,
        "message_template": message_template,
        "sent_date": datetime.now().strftime("%Y-%m-%d"),
    }
    DATA_STORE["reminders"].append(reminder)
    save_data()
    return jsonify(reminder), 201


@app.route("/api/reminders/<int:reminder_id>", methods=["PUT"])
def update_reminder(reminder_id):
    reminder = find_by_id("reminders", reminder_id)
    if not reminder:
        return jsonify({"error": "Pengingat tidak ditemukan"}), 404
    payload = request.get_json(silent=True) or {}
    if "message_template" in payload and payload["message_template"].strip():
        reminder["message_template"] = payload["message_template"].strip()
    save_data()
    return jsonify(reminder)


@app.route("/api/reminders/<int:reminder_id>", methods=["DELETE"])
def delete_reminder(reminder_id):
    reminder = find_by_id("reminders", reminder_id)
    if not reminder:
        return jsonify({"error": "Pengingat tidak ditemukan"}), 404
    DATA_STORE["reminders"] = [r for r in DATA_STORE["reminders"] if r["id"] != reminder_id]
    save_data()
    return jsonify({"message": "Log pengingat berhasil dihapus"})


if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)
