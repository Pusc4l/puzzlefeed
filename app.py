"""
Puzzle Feed Generator & Interactive Game
Flask backend: routing, image validation, PIL cropping, memory-buffered ZIP export.
"""

import io
import os
import uuid
import zipfile
import base64

from flask import Flask, render_template, request, jsonify, send_file, abort
from PIL import Image, UnidentifiedImageError

app = Flask(__name__)

# --- Config -----------------------------------------------------------------
MAX_FILE_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_EXTENSIONS = {'.png', '.jpg', '.jpeg', '.webp'}
MIN_GRID = 3
MAX_GRID = 9

app.config['MAX_CONTENT_LENGTH'] = MAX_FILE_SIZE

# In-memory store: puzzle_id -> ordered list of raw JPEG tile bytes.
# NOTE: This is intentionally an in-process dict (no DB / disk writes) to keep
# the backend stateless-ish and avoid cluttering server storage, per the
# "memory-buffered ZIP generation" requirement. It resets on server restart.
PUZZLE_STORE = {}


# --- Helpers ------------------------------------------------------------------
def allowed_file(filename):
    ext = os.path.splitext(filename)[1].lower()
    return ext in ALLOWED_EXTENSIONS


def error_response(message, status_code=400):
    return jsonify({'success': False, 'error': message}), status_code


# --- Routes -------------------------------------------------------------------
@app.route('/')
def index():
    return render_template('index.html', min_grid=MIN_GRID, max_grid=MAX_GRID)


@app.route('/api/process', methods=['POST'])
def process_image():
    # --- Validate presence of file ---
    if 'image' not in request.files:
        return error_response('Tidak ada file gambar yang diunggah.')

    file = request.files['image']

    if not file or file.filename.strip() == '':
        return error_response('Nama file kosong, silakan pilih gambar.')

    # --- Validate extension ---
    if not allowed_file(file.filename):
        return error_response(
            'Format file tidak didukung. Gunakan PNG, JPG, JPEG, atau WEBP.'
        )

    # --- Validate size ---
    file.stream.seek(0, os.SEEK_END)
    file_size = file.stream.tell()
    file.stream.seek(0)
    if file_size <= 0:
        return error_response('File gambar kosong atau tidak valid.')
    if file_size > MAX_FILE_SIZE:
        return error_response('Ukuran file melebihi batas maksimum 10 MB.')

    # --- Validate grid size ---
    try:
        grid_size = int(request.form.get('grid_size', 3))
    except (TypeError, ValueError):
        return error_response('Ukuran grid tidak valid.')

    if grid_size < MIN_GRID or grid_size > MAX_GRID:
        return error_response(
            f'Ukuran grid harus antara {MIN_GRID}x{MIN_GRID} dan {MAX_GRID}x{MAX_GRID}.'
        )

    # --- Validate & open image (catch corrupted uploads gracefully) ---
    try:
        image = Image.open(file.stream)
        image.verify()  # verify does not decode pixel data; reopen after
        file.stream.seek(0)
        image = Image.open(file.stream)
        image.load()
        image = image.convert('RGB')
    except (UnidentifiedImageError, OSError, ValueError):
        return error_response('File gambar rusak atau tidak dapat dibaca.')
    except Exception:
        return error_response('Terjadi kesalahan saat memproses gambar.', 500)

    # --- Center-crop to a square so every tile comes out perfectly square ---
    width, height = image.size
    side = min(width, height)
    left = (width - side) // 2
    top = (height - side) // 2
    image = image.crop((left, top, left + side, top + side))

    # Resize so the square divides evenly into grid_size tiles with no
    # leftover rounding pixels along the edges.
    tile_size = max(side // grid_size, 1)
    final_side = tile_size * grid_size
    image = image.resize((final_side, final_side), Image.LANCZOS)

    # --- Slice into tiles ---
    tiles = []
    tile_bytes_list = []
    index = 0

    for row in range(grid_size):
        for col in range(grid_size):
            box = (
                col * tile_size,
                row * tile_size,
                (col + 1) * tile_size,
                (row + 1) * tile_size,
            )
            tile_img = image.crop(box)

            buffer = io.BytesIO()
            tile_img.save(buffer, format='JPEG', quality=90)
            tile_bytes = buffer.getvalue()
            tile_bytes_list.append(tile_bytes)

            b64_data = base64.b64encode(tile_bytes).decode('utf-8')
            tiles.append({
                'index': index,          # correct/original position
                'data': f'data:image/jpeg;base64,{b64_data}',
            })
            index += 1

    puzzle_id = str(uuid.uuid4())
    PUZZLE_STORE[puzzle_id] = tile_bytes_list

    return jsonify({
        'success': True,
        'puzzle_id': puzzle_id,
        'grid_size': grid_size,
        'tile_count': len(tiles),
        'tiles': tiles,
    })


@app.route('/api/download/<puzzle_id>')
def download_zip(puzzle_id):
    tile_bytes_list = PUZZLE_STORE.get(puzzle_id)
    if not tile_bytes_list:
        abort(404, description='Puzzle tidak ditemukan atau sudah kedaluwarsa.')

    # Build the ZIP entirely in RAM — nothing touches disk.
    zip_buffer = io.BytesIO()
    with zipfile.ZipFile(zip_buffer, 'w', zipfile.ZIP_DEFLATED) as zip_file:
        for i, tile_bytes in enumerate(tile_bytes_list, start=1):
            filename = f'puzzle_tile_{i}.jpg'
            zip_file.writestr(filename, tile_bytes)
    zip_buffer.seek(0)

    return send_file(
        zip_buffer,
        mimetype='application/zip',
        as_attachment=True,
        download_name='puzzle_tiles.zip',
    )


# --- Error handlers -------------------------------------------------------
@app.errorhandler(413)
def too_large(_e):
    return error_response('File terlalu besar (maksimum 10 MB).', 413)


@app.errorhandler(404)
def not_found(e):
    description = getattr(e, 'description', 'Tidak ditemukan.')
    return error_response(description, 404)


@app.errorhandler(500)
def server_error(_e):
    return error_response('Terjadi kesalahan pada server.', 500)


# Tambahkan deklarasi ini agar disatukan dengan Vercel Serverless Function
app = app

if __name__ == '__main__':
    app.run(debug=True)