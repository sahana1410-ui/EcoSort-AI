# EcoSort – Digital Waste Segregation and Recycling Awareness System

A full-stack educational web application built with:
- **Frontend:** HTML5, CSS3 and JavaScript
- **Backend:** Python Flask (REST API)
- **Database:** SQLite

## Features
1. Responsive green-themed dashboard.
2. Seven waste categories with examples, disposal guidance and safety reminders.
3. Waste activity form with input validation and persistent database storage.
4. Dashboard statistics and recent activity loaded from SQLite.
5. Five-question recycling awareness quiz; quiz results are saved in SQLite.
6. Recent records refresh after each successful entry.

## Requirements
- Python 3.9 or newer
- Internet connection for the optional Google Fonts stylesheet. The app itself works without it.

## Run on Windows
1. Extract the ZIP file.
2. Open Command Prompt in the extracted `digital_waste_awareness` folder.
3. Create a virtual environment (recommended):
   ```bash
   py -m venv venv
   venv\\Scripts\\activate
   ```
4. Install dependencies:
   ```bash
   pip install -r requirements.txt
   ```
5. Start the application:
   ```bash
   python app.py
   ```
6. Open this address in your browser:
   `http://127.0.0.1:5000`

## Run on macOS / Linux
```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
python app.py
```
Then visit `http://127.0.0.1:5000`.

## Database
The SQLite database `waste_awareness.db` is created automatically the first time `app.py` is run. Tables:
- `waste_records` – category, item, quantity, unit, notes and timestamp.
- `quiz_results` – participant name, score, total and timestamp.

The database file is generated at runtime and is not required in the ZIP.

## API endpoints
| Method | Endpoint | Purpose |
|---|---|---|
| GET | `/api/categories` | Get category guidance |
| GET | `/api/stats` | Get dashboard statistics |
| GET | `/api/records` | List latest waste records |
| POST | `/api/records` | Save a waste record |
| DELETE | `/api/records/<id>` | Delete a waste record |
| POST | `/api/quiz` | Save a quiz result |

## Important notes
- This is a local demonstration / academic project. It does not automatically identify waste using a camera or AI.
- Bin colours and accepted materials vary by municipality. Follow your local authority's collection instructions.
- Before public deployment, use production hosting, disable Flask debug mode, add authentication and apply appropriate security and privacy controls.
