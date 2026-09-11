// ==========================================
// WattWater - Smart Solar & Pump Control Engine
// ==========================================

// حالة المنظومة الأساسية (State Management)
const systemState = {
    isRunning: true,
    targetFrequency: 50.0,
    currentFrequency: 50.0,
    dcVoltage: 380,
    maxPowerKw: 0.62,
    baseCurrent: 1.63,
    maxFlow: 3.2
};

// عناصر واجهة المستخدم (DOM Elements)
const elements = {
    btnStart: document.getElementById('btn-start'),
    btnStop: document.getElementById('btn-stop'),
    btnSetFreq: document.getElementById('btn-set-freq'),
    freqInput: document.getElementById('freq-input'),
    solarPower: document.getElementById('solar-power'),
    dcVoltage: document.getElementById('dc-voltage'),
    pumpStatus: document.getElementById('pump-status'),
    pumpCurrent: document.getElementById('pump-current'),
    pumpFlow: document.getElementById('pump-flow')
};

// 1. محاكاة تحديث البيانات اللحظية (Live Telemetry Loop)
function updateTelemetry() {
    if (systemState.isRunning) {
        // التنعيم التدريجي للوصول للتردد المطلوب (Ramping Up/Down)
        if (systemState.currentFrequency < systemState.targetFrequency) {
            systemState.currentFrequency = Math.min(systemState.targetFrequency, systemState.currentFrequency + 2.0);
        } else if (systemState.currentFrequency > systemState.targetFrequency) {
            systemState.currentFrequency = Math.max(systemState.targetFrequency, systemState.currentFrequency - 2.0);
        }

        // إضافة تذبذب طفيف محاكي لتغير الإشعاع الشمسي (Noise Effect)
        const noise = (Math.random() - 0.5) * 0.05;
        const ratio = systemState.currentFrequency / 50.0;

        const currentPower = (systemState.maxPowerKw * Math.pow(ratio, 3) + noise).toFixed(2);
        const currentAmps = (systemState.baseCurrent * ratio + noise * 0.2).toFixed(2);
        const currentFlow = (systemState.maxFlow * ratio).toFixed(1);
        const voltage = Math.floor(systemState.dcVoltage + (Math.random() * 4 - 2));

        // تحديث الكروت بالواجهة
        elements.solarPower.textContent = `${Math.max(0, currentPower)} kW`;
        elements.dcVoltage.textContent = `جهد المستمر: ${voltage} V`;
        elements.pumpStatus.textContent = `تعمل (${systemState.currentFrequency.toFixed(1)} Hz)`;
        elements.pumpStatus.style.color = "var(--accent)";
        elements.pumpCurrent.textContent = `التيار: ${Math.max(0, currentAmps)} A`;
        elements.pumpFlow.textContent = `${Math.max(0, currentFlow)} m³/hr`;

    } else {
        // حالة التوقف التدريجي (Ramping Down to Stop)
        if (systemState.currentFrequency > 0) {
            systemState.currentFrequency = Math.max(0, systemState.currentFrequency - 5.0);
            const ratio = systemState.currentFrequency / 50.0;
            
            elements.pumpStatus.textContent = `جاري الإيقاف... (${systemState.currentFrequency.toFixed(1)} Hz)`;
            elements.solarPower.textContent = `${(systemState.maxPowerKw * Math.pow(ratio, 3)).toFixed(2)} kW`;
            elements.pumpCurrent.textContent = `التيار: ${(systemState.baseCurrent * ratio).toFixed(2)} A`;
            elements.pumpFlow.textContent = `${(systemState.maxFlow * ratio).toFixed(1)} m³/hr`;
        } else {
            // توقف كامل
            elements.solarPower.textContent = `0.00 kW`;
            elements.pumpStatus.textContent = `متوقفة (0.0 Hz)`;
            elements.pumpStatus.style.color = "var(--danger)";
            elements.pumpCurrent.textContent = `التيار: 0.00 A`;
            elements.pumpFlow.textContent = `0.0 m³/hr`;
        }
    }
}

// 2. التحكم بأزرار الواجهة (Control Commands)

// تشغيل المضخة
elements.btnStart.addEventListener('click', () => {
    if (systemState.isRunning && systemState.currentFrequency === systemState.targetFrequency) {
        showNotification("المضخة تعمل بالفعل!", "neutral");
        return;
    }
    
    systemState.isRunning = true;
    systemState.targetFrequency = parseFloat(elements.freqInput.value) || 50.0;
    showNotification("تم إرسال أمر التشغيل إلى الإنفرتر عبر Modbus", "success");
});

// إيقاف المضخة
elements.btnStop.addEventListener('click', () => {
    if (!systemState.isRunning && systemState.currentFrequency === 0) {
        showNotification("المضخة متوقفة بالفعل!", "neutral");
        return;
    }

    systemState.isRunning = false;
    showNotification("تم إرسال أمر الإيقاف إلى الإنفرتر", "danger");
});

// تطبيق التردد الجديد
elements.btnSetFreq.addEventListener('click', () => {
    const newFreq = parseFloat(elements.freqInput.value);

    if (isNaN(newFreq) || newFreq < 10 || newFreq > 50) {
        alert("الرجاء إدخال تردد صحيح بين 10 و 50 هرتز");
        return;
    }

    systemState.targetFrequency = newFreq;
    if (!systemState.isRunning) {
        systemState.isRunning = true; // إعادة التفعيل تلقائياً عند تغيير التردد
    }
    
    showNotification(`تم تغيير التردد المستهدف إلى ${newFreq} Hz`, "success");
});

// 3. إشعارات سريعة للمستخدم (User Feedback UI)
function showNotification(message, type) {
    const mockupHeader = document.querySelector('.mockup-title');
    const originalText = mockupHeader.textContent;

    let statusTag = "[COMMAND SENT]";
    if (type === "danger") statusTag = "[STOP COMMAND]";
    
    mockupHeader.textContent = `${statusTag} ${message}`;
    mockupHeader.style.color = type === "danger" ? "#ef4444" : "#34d399";

    setTimeout(() => {
        mockupHeader.textContent = originalText;
        mockupHeader.style.color = "#9ca3af";
    }, 3000);
}

// تشغيل الحلقة التكرارية كل ثانية واحدة (1 Second Pulse)
setInterval(updateTelemetry, 1000);