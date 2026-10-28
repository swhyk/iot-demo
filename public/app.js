const MAX_POINTS = 30;

const labels = [];
const values = [];

const statusEl = document.getElementById('status');
const currentTempEl = document.getElementById('current-temp');
const totalCountEl = document.getElementById('total-count');

const chart = new Chart(document.getElementById('temp-chart'), {
    type: 'line',
    data: {
        labels,
        datasets: [{
            data: values,
            borderColor: '#38bdf8',
            backgroundColor: 'rgba(56, 189, 248, 0.15)',
            borderWidth: 2,
            tension: 0.3,
            pointRadius: 0,
            fill: true,
        }],
    },
    options: {
        responsive: true,
        maintainAspectRatio: false,
        animation: false,
        plugins: {
            legend: { display: false },
            tooltip: { enabled: true },
        },
        scales: {
            x: {
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: { color: '#94a3b8', maxTicksLimit: 8 },
            },
            y: {
                min: 15,
                max: 35,
                grid: { color: 'rgba(148, 163, 184, 0.1)' },
                ticks: {
                    color: '#94a3b8',
                    callback: (value) => `${value}℃`,
                },
            },
        },
    },
});

function setStatus(text, state) {
    statusEl.textContent = text;
    statusEl.classList.remove('online', 'offline');
    if (state) {
        statusEl.classList.add(state);
    }
}

const source = new EventSource('/events');

source.onopen = () => {
    setStatus('已连接', 'online');
};

source.onmessage = (event) => {
    const point = JSON.parse(event.data);

    labels.push(point.time);
    values.push(point.value);
    if (labels.length > MAX_POINTS) {
        labels.shift();
        values.shift();
    }

    chart.update('none');
    currentTempEl.textContent = point.value.toFixed(1);
    totalCountEl.textContent = point.count;
};

source.onerror = () => {
    setStatus('已断开（自动重连中）', 'offline');
};
