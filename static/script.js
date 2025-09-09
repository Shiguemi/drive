document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const progressWrapper = document.getElementById('progress-wrapper');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const uploadSpeed = document.getElementById('upload-speed');
    const timeRemaining = document.getElementById('time-remaining');
    const fileList = document.getElementById('file-list');
    const deleteButton = document.getElementById('delete-button');
    const pauseButton = document.getElementById('pause-button');
    const resumeButton = document.getElementById('resume-button');

    let uploadStartTime;
    let currentFile = null;
    let isPaused = false;
    let currentChunk = 0;
    const CHUNK_SIZE = 1024 * 1024; // 1MB

    const formatTime = (seconds) => {
        if (seconds === Infinity) return 'Estimating...';
        if (seconds < 60) return `${Math.round(seconds)}s remaining`;
        const minutes = Math.floor(seconds / 60);
        const remainingSeconds = Math.round(seconds % 60);
        return `${minutes}m ${remainingSeconds}s remaining`;
    };

    const fetchFiles = async () => {
        try {
            const response = await fetch('/files');
            const data = await response.json();
            const tableBody = fileList.getElementsByTagName('tbody')[0];
            tableBody.innerHTML = '';
            data.files.forEach(file => {
                const row = tableBody.insertRow();
                const cell1 = row.insertCell(0);
                const checkbox = document.createElement('input');
                checkbox.type = 'checkbox';
                checkbox.name = 'file';
                checkbox.value = file.name;
                cell1.appendChild(checkbox);

                const cell2 = row.insertCell(1);
                const a = document.createElement('a');
                a.href = `/uploads/${file.name}`;
                a.textContent = file.name;
                cell2.appendChild(a);

                const cell3 = row.insertCell(2);
                cell3.textContent = file.date;

                const cell4 = row.insertCell(3);
                cell4.textContent = file.size;
            });
        } catch (error) {
            console.error('Error fetching files:', error);
        }
    };

    deleteButton.addEventListener('click', async () => {
        const selectedFiles = [];
        const checkboxes = document.querySelectorAll('#file-list input[type="checkbox"]:checked');
        checkboxes.forEach(checkbox => {
            selectedFiles.push(checkbox.value);
        });

        if (selectedFiles.length === 0) {
            alert('Please select files to delete.');
            return;
        }

        try {
            const response = await fetch('/delete', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ files: selectedFiles })
            });

            if (response.ok) {
                fetchFiles();
            } else {
                const error = await response.text();
                alert(`Error deleting files: ${error}`);
            }
        } catch (error) {
            alert(`Error deleting files: ${error.message}`);
        }
    });

    const uploadChunk = async (file, start) => {
        if (isPaused) {
            return;
        }

        const end = Math.min(start + CHUNK_SIZE, file.size);
        const chunk = file.slice(start, end);
        currentChunk = start;

        try {
            const response = await fetch(`/upload?filename=${file.name}`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/octet-stream'
                },
                body: chunk
            });

            if (!response.ok) {
                throw new Error('Chunk upload failed');
            }

            const percentage = Math.round((end / file.size) * 100);
            progressBar.value = percentage;
            progressPercentage.textContent = `${percentage}%`;

            const elapsedTime = (Date.now() - uploadStartTime) / 1000;
            const speed = end / elapsedTime;
            const speedMbps = (speed * 8 / 1024 / 1024).toFixed(2);
            uploadSpeed.textContent = `${speedMbps} Mbps`;

            const remainingBytes = file.size - end;
            const remainingTime = remainingBytes / speed;
            timeRemaining.textContent = formatTime(remainingTime);

            if (end < file.size) {
                uploadChunk(file, end);
            } else {
                uploadStatus.textContent = 'Upload complete!';
                currentFile = null;
                fetchFiles();
                setTimeout(() => {
                    progressWrapper.style.display = 'none';
                }, 2000);
            }
        } catch (error) {
            uploadStatus.textContent = `Upload failed: ${error.message}. Retrying...`;
            setTimeout(() => uploadChunk(file, start), 3000);
        }
    };

    const startUpload = async (file) => {
        isPaused = false;
        pauseButton.disabled = false;
        resumeButton.disabled = true;
        uploadStatus.textContent = 'Uploading...';
        progressWrapper.style.display = 'block';
        uploadStartTime = Date.now();

        try {
            const response = await fetch(`/status?filename=${file.name}`);
            const data = await response.json();
            const start = data.size || 0;
            uploadChunk(file, start);
        } catch (error) {
            uploadStatus.textContent = 'Could not get upload status.';
        }
    };

    fileInput.addEventListener('change', () => {
        const file = fileInput.files[0];
        if (!file) {
            return;
        }
        currentFile = file;
        startUpload(currentFile);
    });

    pauseButton.addEventListener('click', () => {
        isPaused = true;
        pauseButton.disabled = true;
        resumeButton.disabled = false;
        uploadStatus.textContent = 'Upload paused.';
    });

    resumeButton.addEventListener('click', () => {
        if (currentFile) {
            isPaused = false;
            pauseButton.disabled = false;
            resumeButton.disabled = true;
            uploadStatus.textContent = 'Resuming...';
            uploadChunk(currentFile, currentChunk);
        }
    });

    fetchFiles();
});
