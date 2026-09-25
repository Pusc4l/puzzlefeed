/* =============================================================
   Puzzle Feed Generator — Frontend Logic (Revisiter)
   ============================================================= */

(function () {
  'use strict';

  // ------------------------------------------------------------------
  // DOM references
  // ------------------------------------------------------------------
  const dropzone        = document.getElementById('dropzone');
  const dropzoneContent = document.getElementById('dropzoneContent');
  const fileInput       = document.getElementById('fileInput');
  const previewImg      = document.getElementById('previewImg');

  const gridSelect      = document.getElementById('gridSelect');
  const generateBtn     = document.getElementById('generateBtn');
  const errorMsg        = document.getElementById('errorMsg');

  const uploadPanel     = document.getElementById('uploadPanel');
  const gamePanel       = document.getElementById('gamePanel');

  const newPuzzleBtn    = document.getElementById('newPuzzleBtn');
  const peekBtn         = document.getElementById('peekBtn');
  const downloadBtn     = document.getElementById('downloadBtn');

  const puzzleBoard     = document.getElementById('puzzleBoard');
  const peekOverlay     = document.getElementById('peekOverlay');

  const winModal          = document.getElementById('winModal');
  const modalPlayAgainBtn = document.getElementById('modalPlayAgainBtn');
  const modalDownloadBtn  = document.getElementById('modalDownloadBtn');

  const loadingOverlay  = document.getElementById('loadingOverlay');
  const loadingText     = document.getElementById('loadingText');

  // ------------------------------------------------------------------
  // Config / constants
  // ------------------------------------------------------------------
  const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/webp'];
  const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB

  // ------------------------------------------------------------------
  // State
  // ------------------------------------------------------------------
  const state = {
    selectedFile: null,
    puzzleId: null,
    gridSize: 3,
    tileCount: 0,
    originalTiles: [],
    board: [],
    selectedPosition: null,
    dragSourcePosition: null,
    solved: false,
    originalImageDataUrl: null,
  };

  // ==================================================================
  // Upload / Dropzone handling
  // ==================================================================

  dropzone.addEventListener('click', () => fileInput.click());

  dropzone.addEventListener('dragover', (e) => {
    e.preventDefault();
    dropzone.classList.add('dragover');
  });

  dropzone.addEventListener('dragleave', () => {
    dropzone.classList.remove('dragover');
  });

  dropzone.addEventListener('drop', (e) => {
    e.preventDefault();
    dropzone.classList.remove('dragover');
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelection(files[0]);
    }
  });

  fileInput.addEventListener('change', () => {
    if (fileInput.files && fileInput.files.length > 0) {
      handleFileSelection(fileInput.files[0]);
    }
  });

  function handleFileSelection(file) {
    hideError();

    if (!ALLOWED_TYPES.includes(file.type)) {
      showError('Format file tidak didukung. Gunakan PNG, JPG, JPEG, atau WEBP.');
      resetSelection();
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      showError('Ukuran file melebihi batas maksimum 10 MB.');
      resetSelection();
      return;
    }

    state.selectedFile = file;

    const reader = new FileReader();
    reader.onload = (ev) => {
      previewImg.src = ev.target.result;
      previewImg.hidden = false;
      dropzoneContent.hidden = true;
      dropzone.classList.add('has-image');
      generateBtn.disabled = false;
    };
    reader.onerror = () => {
      showError('Gagal membaca file gambar. Coba file lain.');
      resetSelection();
    };
    reader.readAsDataURL(file);
  }

  function resetSelection() {
    state.selectedFile = null;
    previewImg.src = '';
    previewImg.hidden = true;
    dropzoneContent.hidden = false;
    dropzone.classList.remove('has-image');
    generateBtn.disabled = true;
    fileInput.value = '';
  }

  function showError(message) {
    errorMsg.textContent = message;
    errorMsg.hidden = false;
  }

  function hideError() {
    errorMsg.hidden = true;
    errorMsg.textContent = '';
  }

  // ==================================================================
  // Loading overlay controller (Aturan 2)
  // ==================================================================

  function setLoading(isLoading, text = 'Memproses gambar...') {
    if (loadingOverlay) {
      loadingOverlay.hidden = !isLoading;
    }
    if (loadingText) {
      loadingText.textContent = text;
    }
    if (generateBtn) {
      generateBtn.disabled = isLoading || !state.selectedFile;
    }
  }

  // ==================================================================
  // Generate puzzle
  // ==================================================================

  generateBtn.addEventListener('click', async () => {
    if (!state.selectedFile) return;

    hideError();
    setLoading(true, 'Memotong gambar & menyiapkan puzzle...');

    try {
      const formData = new FormData();
      formData.append('image', state.selectedFile);
      formData.append('grid_size', gridSelect.value);

      const res = await fetch('/api/process', {
        method: 'POST',
        body: formData,
      });

      const data = await res.json();

      if (!res.ok || !data.success) {
        showError(data.error || 'Terjadi kesalahan saat memproses gambar.');
        return;
      }

      initPuzzle(data);
    } catch (err) {
      showError('Tidak dapat terhubung ke server. Coba lagi.');
    } finally {
      setLoading(false);
    }
  });

  // ==================================================================
  // Puzzle initialization (Aturan 2)
  // ==================================================================

  function initPuzzle(data) {
    setLoading(false); // Memastikan loading overlay tertutup rapat
    
    state.puzzleId = data.puzzle_id;
    state.gridSize = data.grid_size;
    state.tileCount = data.tile_count;
    state.originalTiles = data.tiles;
    state.solved = false;
    state.selectedPosition = null;

    state.originalImageDataUrl = previewImg.src;

    state.board = state.originalTiles.slice();
    shuffleBoard();

    document.documentElement.style.setProperty('--grid-size', state.gridSize);

    renderBoard();

    uploadPanel.hidden = true;
    gamePanel.hidden = false;
    peekOverlay.hidden = true;
    
    if (winModal) {
      winModal.hidden = true;
    }
  }

  function shuffleBoard() {
    let attempts = 0;
    do {
      for (let i = state.board.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [state.board[i], state.board[j]] = [state.board[j], state.board[i]];
      }
      attempts++;
    } while (isSolved() && state.board.length > 1 && attempts < 20);
  }

  // ==================================================================
  // Rendering
  // ==================================================================

  function renderBoard() {
    puzzleBoard.innerHTML = '';

    state.board.forEach((tile, position) => {
      const tileEl = document.createElement('div');
      tileEl.className = 'puzzle-tile';
      tileEl.style.backgroundImage = `url(${tile.data})`;
      tileEl.dataset.position = String(position);
      tileEl.dataset.tileIndex = String(tile.index);
      tileEl.draggable = true;

      if (tile.index === position) {
        tileEl.classList.add('correct');
      }

      // Click-to-swap
      tileEl.addEventListener('click', () => onTileClick(position));

      // Drag and drop
      tileEl.addEventListener('dragstart', (e) => onDragStart(e, position));
      tileEl.addEventListener('dragover', (e) => onDragOver(e, position));
      tileEl.addEventListener('dragleave', () => onDragLeave(tileEl));
      tileEl.addEventListener('drop', (e) => onDrop(e, position));
      tileEl.addEventListener('dragend', () => onDragEnd());

      puzzleBoard.appendChild(tileEl);
    });
  }

  function refreshTileClasses() {
    const tileEls = puzzleBoard.querySelectorAll('.puzzle-tile');
    tileEls.forEach((el) => {
      const position = parseInt(el.dataset.position, 10);
      const tileIndex = parseInt(el.dataset.tileIndex, 10);
      el.classList.toggle('correct', tileIndex === position);
      el.classList.toggle('selected', position === state.selectedPosition);
    });
  }

  // ==================================================================
  // Click-to-swap & Drag-and-drop
  // ==================================================================

  function onTileClick(position) {
    if (state.solved) return;

    if (state.selectedPosition === null) {
      state.selectedPosition = position;
      refreshTileClasses();
      return;
    }

    if (state.selectedPosition === position) {
      state.selectedPosition = null;
      refreshTileClasses();
      return;
    }

    swapPositions(state.selectedPosition, position);
    state.selectedPosition = null;
    renderBoard();
    checkVictory();
  }

  function onDragStart(e, position) {
    if (state.solved) {
      e.preventDefault();
      return;
    }
    state.dragSourcePosition = position;
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(position));
    requestAnimationFrame(() => {
      const el = tileElAt(position);
      if (el) el.classList.add('dragging');
    });
  }

  function onDragOver(e, position) {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (state.dragSourcePosition === null || state.dragSourcePosition === position) return;
    const el = tileElAt(position);
    if (el) el.classList.add('drag-over');
  }

  function onDragLeave(tileEl) {
    tileEl.classList.remove('drag-over');
  }

  function onDrop(e, position) {
    e.preventDefault();
    const source = state.dragSourcePosition;
    clearDragVisuals();

    if (source === null || source === position || state.solved) return;

    swapPositions(source, position);
    state.dragSourcePosition = null;
    renderBoard();
    checkVictory();
  }

  function onDragEnd() {
    state.dragSourcePosition = null;
    clearDragVisuals();
  }

  function clearDragVisuals() {
    const tileEls = puzzleBoard.querySelectorAll('.puzzle-tile');
    tileEls.forEach((el) => {
      el.classList.remove('dragging');
      el.classList.remove('drag-over');
    });
  }

  function tileElAt(position) {
    return puzzleBoard.querySelector(`.puzzle-tile[data-position="${position}"]`);
  }

  function swapPositions(posA, posB) {
    const temp = state.board[posA];
    state.board[posA] = state.board[posB];
    state.board[posB] = temp;
  }

  function isSolved() {
    return state.board.every((tile, position) => tile.index === position);
  }

  // ==================================================================
  // Modal & Victory Management (Aturan 2)
  // ==================================================================

  function checkVictory() {
    if (isSolved()) {
      state.solved = true;
      showWinModal();
    }
  }

  function showWinModal() {
    setLoading(false); // Mencegah spinner/overlay loading aktif bersamaan
    if (winModal) {
      winModal.hidden = false;
    }
  }

  function hideWinModal() {
    if (winModal) {
      winModal.hidden = true;
    }
  }

  // ==================================================================
  // Peek Preview
  // ==================================================================

  let peekActive = false;

  function setPeek(active) {
    peekActive = active;
    if (active && state.originalImageDataUrl) {
      peekOverlay.src = state.originalImageDataUrl;
      peekOverlay.hidden = false;
    } else {
      peekOverlay.hidden = true;
    }
  }

  peekBtn.addEventListener('click', () => setPeek(!peekActive));
  peekBtn.addEventListener('mousedown', () => setPeek(true));
  peekBtn.addEventListener('mouseup', () => setPeek(false));
  peekBtn.addEventListener('mouseleave', () => { if (peekActive) setPeek(false); });
  peekBtn.addEventListener('touchstart', (e) => { e.preventDefault(); setPeek(true); });
  peekBtn.addEventListener('touchend', (e) => { e.preventDefault(); setPeek(false); });

  // ==================================================================
  // Download ZIP
  // ==================================================================

  function triggerDownload() {
    if (!state.puzzleId) return;
    window.location.href = `/api/download/${state.puzzleId}`;
  }

  downloadBtn.addEventListener('click', triggerDownload);
  modalDownloadBtn.addEventListener('click', triggerDownload);

  // ==================================================================
  // Reset & Navigation (Aturan 2)
  // ==================================================================

  newPuzzleBtn.addEventListener('click', () => {
    goToUploadScreen();
  });

  modalPlayAgainBtn.addEventListener('click', () => {
    hideWinModal();
    setLoading(false);
    state.solved = false;
    state.selectedPosition = null;
    state.board = state.originalTiles.slice();
    shuffleBoard();
    renderBoard();
  });

  function goToUploadScreen() {
    setLoading(false);
    hideWinModal();
    setPeek(false);
    
    gamePanel.hidden = true;
    uploadPanel.hidden = false;
    
    resetSelection();
    hideError();

    state.puzzleId = null;
    state.originalTiles = [];
    state.board = [];
    state.selectedPosition = null;
    state.solved = false;
  }

})();