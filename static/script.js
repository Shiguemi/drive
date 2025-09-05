document.addEventListener('DOMContentLoaded', () => {
    const uploadForm = document.getElementById('upload-form');
    const fileInput = document.getElementById('file-input');
    const uploadStatus = document.getElementById('upload-status');
    const fileList = document.getElementById('file-list');
    const deleteButton = document.getElementById('delete-button');

    const fetchFiles = async () => {
        const response = await fetch('/files');
        const data = await response.json();
        fileList.innerHTML = '';
        data.files.forEach(file => {
            const li = document.createElement('li');
            const checkbox = document.createElement('input');
            checkbox.type = 'checkbox';
            checkbox.name = 'file';
            checkbox.value = file;
            li.appendChild(checkbox);

            const a = document.createElement('a');
            a.href = `/uploads/${file}`;
            a.textContent = file;
            li.appendChild(a);
            fileList.appendChild(li);
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

    uploadForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const formData = new FormData();
        formData.append('file', fileInput.files[0]);

        uploadStatus.textContent = 'Uploading...';

        try {
            const response = await fetch('/upload', {
                method: 'POST',
                body: formData
            });

            if (response.ok) {
                uploadStatus.textContent = 'Upload successful!';
                fileInput.value = '';
                fetchFiles();
            } else {
                const error = await response.text();
                uploadStatus.textContent = `Upload failed: ${error}`;
            }
        } catch (error) {
            uploadStatus.textContent = `Upload failed: ${error.message}`;
        }
    });

    fetchFiles();
});
