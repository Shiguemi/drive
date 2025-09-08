import os
import datetime
import logging
from flask import Flask, flash, request, redirect, url_for, send_from_directory, render_template, jsonify
from werkzeug.utils import secure_filename

logging.basicConfig(level=logging.INFO)

UPLOAD_FOLDER = 'uploads'
ALLOWED_EXTENSIONS = {'txt', 'pdf', 'png', 'jpg', 'jpeg', 'gif', 'mp4', 'zip', '7z', '.gz', 'tgz'}

app = Flask(__name__)
app.config['UPLOAD_FOLDER'] = UPLOAD_FOLDER
app.config['SECRET_KEY'] = 'supersecretkey'

def allowed_file(filename):
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def get_file_details(folder, filename):
    filepath = os.path.join(folder, filename)
    if os.path.exists(filepath):
        stat = os.stat(filepath)
        size = stat.st_size
        if size < 1024:
            size_str = f"{size} B"
        elif size < 1024**2:
            size_str = f"{size/1024:.2f} KB"
        elif size < 1024**3:
            size_str = f"{size/1024**2:.2f} MB"
        else:
            size_str = f"{size/1024**3:.2f} GB"

        mod_time = datetime.datetime.fromtimestamp(stat.st_mtime)
        return {
            'name': filename,
            'date': mod_time.strftime('%Y-%m-%d %H:%M:%S'),
            'size': size_str
        }
    return None

@app.route('/')
def index():
    folder = app.config['UPLOAD_FOLDER']
    files = [get_file_details(folder, f) for f in os.listdir(folder)]
    files = [f for f in files if f]
    return render_template('index.html', files=files)

@app.route('/upload', methods=['POST'])
def upload_file():
    if 'file' in request.files:
        file = request.files['file']
        if file.filename == '':
            flash('No selected file')
            return redirect(request.url)
        if file and allowed_file(file.filename):
            filename = secure_filename(file.filename)
            file.save(os.path.join(app.config['UPLOAD_FOLDER'], filename))
            return redirect(url_for('index'))

    filename = secure_filename(request.args.get('filename'))
    if not filename:
        return 'No filename provided', 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    logging.info(f"Writing chunk to {filepath}")
    logging.info(f"Chunk size: {len(request.data)}")

    if not os.path.exists(app.config['UPLOAD_FOLDER']):
        os.makedirs(app.config['UPLOAD_FOLDER'])

    with open(filepath, 'ab') as f:
        f.write(request.data)

    logging.info(f"File size after write: {os.path.getsize(filepath)}")

    return 'Chunk uploaded', 200

@app.route('/status')
def status():
    filename = secure_filename(request.args.get('filename'))
    if not filename:
        return 'No filename provided', 400

    filepath = os.path.join(app.config['UPLOAD_FOLDER'], filename)
    if os.path.exists(filepath):
        return jsonify({'size': os.path.getsize(filepath)})
    else:
        return jsonify({'size': 0})

@app.route('/uploads/<filename>')
def uploaded_file(filename):
    return send_from_directory(app.config['UPLOAD_FOLDER'], filename)

@app.route('/files')
def list_files():
    folder = app.config['UPLOAD_FOLDER']
    files = [get_file_details(folder, f) for f in os.listdir(folder)]
    files = [f for f in files if f]
    return {'files': files}

@app.route('/delete', methods=['POST'])
def delete_files():
    data = request.get_json()
    files_to_delete = data.get('files', [])
    for filename in files_to_delete:
        if '/' in filename or '\\' in filename:
            continue
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], filename)
        if os.path.exists(file_path):
            os.remove(file_path)
    return {'message': 'Files deleted successfully'}

if __name__ == "__main__":
    if not os.path.exists(UPLOAD_FOLDER):
        os.makedirs(UPLOAD_FOLDER)
    app.run(debug=True, use_reloader=False)
