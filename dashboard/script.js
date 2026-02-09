let currentStep = 1;

// Init
document.addEventListener('DOMContentLoaded', async () => {
    // Load Districts
    const distSelect = document.getElementById('district');
    try {
        const dRes = await fetch('/api/districts');
        const districts = await dRes.json();
        districts.forEach(d => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = d;
            distSelect.appendChild(opt);
        });
    } catch (e) {
        console.error("Districts load error:", e);
    }

    // Auto-calculate on input
    const inputs = document.querySelectorAll('input[type="number"]');
    inputs.forEach(input => {
        input.addEventListener('input', calculateTotals);
    });

    // Load saved info
    const savedFio = localStorage.getItem('d_fio');
    const savedPhone = localStorage.getItem('d_phone');
    if (savedFio) document.getElementById('fio').value = savedFio;
    if (savedPhone) document.getElementById('phone').value = savedPhone;
});

function nextStep(step) {
    if (!validateStep(currentStep)) return;

    // Smooth transition
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.getElementById(`step${step}`).classList.add('active');

    updateProgress(step);
    currentStep = step;

    if (step === 1) {
        localStorage.setItem('d_fio', document.getElementById('fio').value);
        localStorage.setItem('d_phone', document.getElementById('phone').value);
    }
}

function prevStep(step) {
    document.getElementById(`step${currentStep}`).classList.remove('active');
    document.getElementById(`step${step}`).classList.add('active');
    updateProgress(step);
    currentStep = step;
}

function updateProgress(step) {
    const bar = document.getElementById('progressBar');
    bar.style.width = (step * 25) + '%';

    document.querySelectorAll('.step').forEach((s, idx) => {
        if (idx + 1 < step) s.classList.add('completed');
        else s.classList.remove('completed');

        if (idx + 1 === step) s.classList.add('active');
        else s.classList.remove('active');
    });
}

function validateStep(step) {
    const activeStep = document.getElementById(`step${step}`);
    const required = activeStep.querySelectorAll('[required]');
    for (let el of required) {
        if (!el.value) {
            el.style.borderColor = 'var(--secondary)';
            el.focus();
            return false;
        } else {
            el.style.borderColor = 'rgba(255, 255, 255, 0.1)';
        }
    }
    return true;
}

async function loadSchools() {
    const dist = document.getElementById('district').value;
    const schoolSelect = document.getElementById('school');
    schoolSelect.innerHTML = '<option value="">Yuklanmoqda...</option>';
    schoolSelect.disabled = true;

    try {
        const response = await fetch(`/api/schools?district=${encodeURIComponent(dist)}`);
        const schools = await response.json();

        schoolSelect.innerHTML = '<option value="">Maktabni tanlang...</option>';
        schools.forEach(s => {
            const opt = document.createElement('option');
            opt.value = opt.textContent = s;
            schoolSelect.appendChild(opt);
        });
        schoolSelect.disabled = false;
    } catch (e) {
        schoolSelect.innerHTML = '<option value="">Xatolik yuz berdi</option>';
    }
}

function calculateTotals() {
    const total = parseInt(document.getElementById('total_students').value) || 0;
    const sababliInputs = document.querySelectorAll('.sababli');
    let sababliTotal = 0;
    sababliInputs.forEach(i => sababliTotal += (parseInt(i.value) || 0));

    // For simplicity in this demo form, we'll assume a "Total Absent" field would be here
    // In the real app, we might add more fields.
    const absent = sababliTotal; // This is a placeholder
    const percent = total > 0 ? (((total - absent) / total) * 100).toFixed(1) : 0;

    document.getElementById('sum_absent').textContent = absent;
    document.getElementById('sum_percent').textContent = percent + '%';
}

document.getElementById('attendanceForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = e.target.querySelector('.btn-submit');
    submitBtn.disabled = true;
    submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Yuborilmoqda...';

    // Collect data
    const formData = {
        action: 'add',
        district: document.getElementById('district').value,
        school: document.getElementById('school').value,
        fio: document.getElementById('fio').value,
        phone: document.getElementById('phone').value,
        classes_count: document.getElementById('classes_count').value,
        total_students: document.getElementById('total_students').value,
        sababli_kasal: document.getElementById('sababli_kasal').value,
        sababli_tadbirlar: document.getElementById('sababli_tadbirlar').value,
        sababli_oilaviy: document.getElementById('sababli_oilaviy').value,
        sababli_ijtimoiy: document.getElementById('sababli_ijtimoiy').value
    };

    try {
        const res = await fetch('/api/submit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(formData)
        });

        if (res.ok) {
            document.getElementById('successOverlay').classList.remove('hidden');
        } else {
            alert('Xatolik yuz berdi. Iltimos qaytadan urinib ko\'ring.');
            submitBtn.disabled = false;
            submitBtn.textContent = 'Yuborish';
        }
    } catch (e) {
        alert('Tarmoq xatoligi!');
        submitBtn.disabled = false;
        submitBtn.textContent = 'Yuborish';
    }
});
