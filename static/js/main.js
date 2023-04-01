const startBtn = document.getElementById('start-button');
const timer = document.getElementById('timer');
const textArea = document.getElementById('text-area');
let startTime;

startBtn.addEventListener('click', () => {
  textArea.disabled = false;
  textArea.focus();
  startBtn.style.display = 'none';
  textArea.value = '';
  startTime = Date.now();
  setInterval(() => {
    const elapsedTime = new Date(Date.now() - startTime).toISOString().substr(14, 5);
    timer.innerHTML = elapsedTime;
    if ((Date.now() - startTime) > 5000) {
      textArea.value = '';
      startTime = null;
      timer.innerHTML = '00:00';
    }
  }, 1000);
});
