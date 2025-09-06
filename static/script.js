document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const progressWrapper = document.getElementById('progress-wrapper');
    const progressBar = document.getElementById('progress-bar');
    const progressPercentage = document.getElementById('progress-percentage');
    const transferSpeedElem = document.getElementById('transfer-speed');
    const timeRemainingElem = document.getElementById('time-remaining');
    const fileList = document.getElementById('file-list');
    const deleteButton = document.getElementById('delete-button');

    const fetchFiles = async () => {
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
                headers: {
                    'Content-Type': 'application/json'
                },
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

    uploadForm.addEventListener('submit', (e) => {
        e.preventDefault();

        const file = fileInput.files[0];
        if (!file) {
            uploadStatus.textContent = 'Please select a file to upload.';
            return;
        }

        const formData = new FormData();
        formData.append('file', file);

        const xhr = new XMLHttpRequest();
        let startTime = Date.now();

        xhr.upload.addEventListener('progress', (e) => {
            if (e.lengthComputable) {
                const percentage = Math.round((e.loaded / e.total) * 100);
                progressWrapper.style.display = 'block';
                progressBar.value = percentage;
                progressPercentage.textContent = `${percentage}%`;

                const elapsedTime = (Date.now() - startTime) / 1000; // in seconds
                if (elapsedTime > 0) {
                    const transferSpeed = e.loaded / elapsedTime; // bytes per second
                    const remainingBytes = e.total - e.loaded;
                    const timeRemaining = remainingBytes / transferSpeed;

                    transferSpeedElem.textContent = `${(transferSpeed / 1024 / 1024).toFixed(2)} MB/s`;
                    if (isFinite(timeRemaining)) {
                        timeRemainingElem.textContent = `${Math.round(timeRemaining)}s remaining`;
                    } else {
                        timeRemainingElem.textContent = 'Calculating...';
                    }
                } else {
                    transferSpeedElem.textContent = '0.00 MB/s';
                    timeRemainingElem.textContent = 'Calculating...';
                }
            }
        });

        xhr.addEventListener('load', () => {
            if (xhr.status === 200) {
                uploadStatus.textContent = 'Upload successful!';
                fileInput.value = '';
                fetchFiles();
            } else {
                uploadStatus.textContent = `Upload failed: ${xhr.statusText}`;
            }
            setTimeout(() => {
                progressWrapper.style.display = 'none';
            }, 2000);
        });

        xhr.addEventListener('error', () => {
            uploadStatus.textContent = 'Upload failed.';
            progressWrapper.style.display = 'none';
        });

        xhr.open('POST', '/upload', true);
        xhr.send(formData);

        uploadStatus.textContent = 'Uploading...';
    });

    fetchFiles();
});
