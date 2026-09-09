document.addEventListener('DOMContentLoaded', async () => {
    const statusEl = document.getElementById('status');
    try {
        const response = await fetch('/api/health');
        if (response.ok) {
            const data = await response.json();
            statusEl.textContent = `🟢 Backend Online (${data.app} - ${data.environment})`;
            statusEl.classList.add('online');
        } else {
            statusEl.textContent = `🟡 Server returned status: ${response.status}`;
        }
    } catch (err) {
        statusEl.textContent = `🔴 Failed to connect to backend: ${err.message}`;
    }
});
