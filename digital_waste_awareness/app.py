from flask import Flask, render_template, request, jsonify
import sqlite3
from pathlib import Path
from datetime import datetime
from io import BytesIO
from PIL import Image, UnidentifiedImageError

app = Flask(__name__)
# Maximum uploaded image size: 5 MB
app.config["MAX_CONTENT_LENGTH"] = 5 * 1024 * 1024
DB_PATH = Path(__file__).with_name("waste_awareness.db")

CATEGORIES = {
    "Organic": {
        "color": "#2f855a",
        "items": ["fruit and vegetable peels", "leftover food", "tea leaves", "dry leaves"],
        "bin": "Green bin",
        "method": "Compost at home or send to an organic-waste composting facility.",
        "avoid": "Do not mix with plastic, glass, batteries or sanitary waste."
    },
    "Plastic": {
        "color": "#3182ce",
        "items": ["clean bottles", "containers", "packaging", "plastic jars"],
        "bin": "Blue / dry-waste bin",
        "method": "Empty, rinse and dry recyclable plastic. Follow your local collection rules.",
        "avoid": "Avoid putting food-soiled or multilayer packaging in recycling unless locally accepted."
    },
    "Paper": {
        "color": "#d69e2e",
        "items": ["newspapers", "office paper", "cardboard", "paper bags"],
        "bin": "Blue / dry-waste bin",
        "method": "Keep paper clean and dry, flatten cardboard and send it for paper recycling.",
        "avoid": "Do not mix wet, oily or heavily food-soiled paper with clean paper."
    },
    "Glass": {
        "color": "#805ad5",
        "items": ["glass bottles", "jars", "food containers"],
        "bin": "Separate glass collection",
        "method": "Empty containers and use a designated glass collection point where available.",
        "avoid": "Do not put broken glass loose into a bag. Follow local safe-handling guidance."
    },
    "Metal": {
        "color": "#718096",
        "items": ["aluminium cans", "steel tins", "clean metal containers"],
        "bin": "Blue / dry-waste bin",
        "method": "Empty and rinse cans or tins, then send them to an authorised recycler.",
        "avoid": "Keep sharp edges safely contained; never mix batteries with ordinary metal scrap."
    },
    "E-waste": {
        "color": "#dd6b20",
        "items": ["old phones", "chargers", "computers", "small electronics"],
        "bin": "Authorised e-waste collection",
        "method": "Take electronics to an authorised e-waste collection centre or take-back programme.",
        "avoid": "Never place electronics or batteries in regular household bins."
    },
    "Hazardous": {
        "color": "#c53030",
        "items": ["paint", "chemicals", "pesticides", "batteries", "fluorescent lamps"],
        "bin": "Special hazardous-waste collection",
        "method": "Keep items in their original labelled containers when safe and contact your local authority for collection instructions.",
        "avoid": "Do not pour chemicals into drains or mix unknown substances."
    }
}

def connect():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    with connect() as conn:
        conn.execute("""
            CREATE TABLE IF NOT EXISTS waste_records (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                category TEXT NOT NULL,
                item_name TEXT NOT NULL,
                quantity REAL NOT NULL,
                unit TEXT NOT NULL,
                notes TEXT DEFAULT '',
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS quiz_results (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_name TEXT NOT NULL,
                score INTEGER NOT NULL,
                total INTEGER NOT NULL,
                created_at TEXT NOT NULL
            )
        """)
        conn.execute("""
            CREATE TABLE IF NOT EXISTS recycling_centers (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                name TEXT NOT NULL,
                address TEXT NOT NULL,
                city TEXT NOT NULL,
                state TEXT DEFAULT 'Tamil Nadu',
                postal_code TEXT DEFAULT '',
                accepted_categories TEXT DEFAULT '',
                phone TEXT DEFAULT '',
                website TEXT DEFAULT '',
                latitude REAL,
                longitude REAL
            )
        """)
        centers = [
            ("Green Era Recyclers", "Seerapalayam", "Coimbatore", "Tamil Nadu", "E-waste"),
            ("Green India Recyclers", "Kinathukadavu", "Coimbatore", "Tamil Nadu", "E-waste"),
            ("Techazar E-Cyclers", "Madukkarai", "Coimbatore", "Tamil Nadu", "E-waste"),
            ("Dharani Recyclers", "Rathinapuri", "Coimbatore", "Tamil Nadu", "E-waste")
        ]

        for center in centers:
            exists = conn.execute(
                "SELECT id FROM recycling_centers WHERE name = ?",
                (center[0],)
            ).fetchone()

            if not exists:
                conn.execute("""
                    INSERT INTO recycling_centers
                    (name, address, city, state, accepted_categories)
                    VALUES (?, ?, ?, ?, ?)
                """, center)


@app.route("/")
def home():
    return render_template("index.html")

@app.get("/api/categories")
def categories():
    return jsonify(CATEGORIES)

@app.errorhandler(413)
def file_too_large(error):
    return jsonify({
        "error": "Image is too large. Maximum allowed size is 5 MB."
    }), 413


@app.post("/api/classify")
def classify_waste():
    uploaded_file = request.files.get("image")

    # Check whether an image was uploaded
    if uploaded_file is None:
        return jsonify({
            "error": "Please upload an image."
        }), 400

    if not uploaded_file.filename:
        return jsonify({
            "error": "Please select an image file."
        }), 400

    # Check allowed extensions
    allowed_extensions = {"jpg", "jpeg", "png", "webp"}

    extension = uploaded_file.filename.rsplit(".", 1)[-1].lower()

    if "." not in uploaded_file.filename or extension not in allowed_extensions:
        return jsonify({
            "error": "Only JPG, JPEG, PNG and WEBP images are accepted."
        }), 400

    # Read the image without saving it to disk
    image_bytes = uploaded_file.read()

    if not image_bytes:
        return jsonify({
            "error": "The uploaded image is empty."
        }), 400

    try:
        # Verify that the uploaded file is a genuine image
        with Image.open(BytesIO(image_bytes)) as image:
            if image.format not in {"JPEG", "PNG", "WEBP"}:
                return jsonify({
                    "error": "Unsupported image format."
                }), 400

            width, height = image.size

            if width < 1 or height < 1 or width > 6000 or height > 6000:
                return jsonify({
                    "error": "Image dimensions are not supported."
                }), 400

            image.verify()

    except (UnidentifiedImageError, OSError, Image.DecompressionBombError):
        return jsonify({
            "error": "The uploaded file is not a valid image."
        }), 400

    # Genuine AI model has not been connected yet.
    # Never return a fabricated prediction.
    return jsonify({
        "status": "model_not_configured",
        "message": "Image uploaded and validated successfully. An AI classification model is not connected yet.",
        "prediction": None,
        "confidence": None,
        "mode": "not_configured"
    }), 503


@app.get("/api/stats")
def stats():
    with connect() as conn:
        total = conn.execute("SELECT COUNT(*) FROM waste_records").fetchone()[0]
        quantity = conn.execute("SELECT COALESCE(SUM(quantity), 0) FROM waste_records").fetchone()[0]
        by_category = conn.execute("""
            SELECT category, COUNT(*) AS records, ROUND(SUM(quantity), 2) AS quantity
            FROM waste_records GROUP BY category ORDER BY records DESC
        """).fetchall()
        recent = conn.execute("""
            SELECT id, category, item_name, quantity, unit, created_at
            FROM waste_records ORDER BY id DESC LIMIT 6
        """).fetchall()
        quizzes = conn.execute("SELECT COUNT(*) FROM quiz_results").fetchone()[0]
    return jsonify({
        "total_records": total,
        "total_quantity": round(quantity, 2),
        "quiz_attempts": quizzes,
        "by_category": [dict(r) for r in by_category],
        "recent": [dict(r) for r in recent]
    })

@app.post("/api/records")
def add_record():
    data = request.get_json(silent=True) or {}
    category = str(data.get("category", "")).strip()
    item_name = str(data.get("item_name", "")).strip()
    unit = str(data.get("unit", "kg")).strip()
    notes = str(data.get("notes", "")).strip()
    try:
        quantity = float(data.get("quantity", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Enter a valid quantity."}), 400
    if category not in CATEGORIES:
        return jsonify({"error": "Choose a valid waste category."}), 400
    if not item_name or len(item_name) > 100:
        return jsonify({"error": "Enter an item name (up to 100 characters)."}), 400
    if quantity <= 0 or quantity > 100000:
        return jsonify({"error": "Quantity must be greater than 0 and no more than 100000."}), 400
    if unit not in ("kg", "g", "items"):
        return jsonify({"error": "Choose kg, g or items."}), 400
    with connect() as conn:
        cur = conn.execute("""
            INSERT INTO waste_records(category, item_name, quantity, unit, notes, created_at)
            VALUES (?, ?, ?, ?, ?, ?)
        """, (category, item_name, quantity, unit, notes[:300], datetime.now().isoformat(timespec="seconds")))
        record_id = cur.lastrowid
    return jsonify({"message": "Waste record saved successfully.", "id": record_id}), 201

@app.post("/api/quiz")
def save_quiz():
    data = request.get_json(silent=True) or {}
    name = str(data.get("name", "Guest")).strip()[:60] or "Guest"
    try:
        score = int(data.get("score", -1))
        total = int(data.get("total", 0))
    except (TypeError, ValueError):
        return jsonify({"error": "Invalid quiz result."}), 400
    if total != 5 or score < 0 or score > total:
        return jsonify({"error": "Invalid quiz result."}), 400
    with connect() as conn:
        conn.execute(
            "INSERT INTO quiz_results(user_name, score, total, created_at) VALUES (?, ?, ?, ?)",
            (name, score, total, datetime.now().isoformat(timespec="seconds"))
        )
    return jsonify({"message": "Your quiz result has been saved."}), 201

@app.route("/api/centers", methods=["GET"])
def get_centers():
    with connect() as conn:
        rows = conn.execute(
            "SELECT * FROM recycling_centers ORDER BY city, name"
        ).fetchall()

    return jsonify([dict(row) for row in rows])

@app.get("/api/records")
def records():
    with connect() as conn:
        rows = conn.execute("""
            SELECT id, category, item_name, quantity, unit, notes, created_at
            FROM waste_records ORDER BY id DESC LIMIT 100
        """).fetchall()
    return jsonify([dict(r) for r in rows])

@app.delete("/api/records/<int:record_id>")
def delete_record(record_id):
    with connect() as conn:
        cur = conn.execute("DELETE FROM waste_records WHERE id = ?", (record_id,))
        if cur.rowcount == 0:
            return jsonify({"error": "Record not found."}), 404
    return jsonify({"message": "Record deleted."})

if __name__ == "__main__":
    init_db()
    app.run(debug=True, host="127.0.0.1", port=5000)
