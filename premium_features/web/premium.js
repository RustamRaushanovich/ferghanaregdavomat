// Premium Features Controller
const PremiumUI = {
    isPro: false,

    async init() {
        this.injectCSS();
        await this.checkStatus();
        this.renderPremiumElements();
        this.setupModal();
        this.listenForPhoneChange();
    },

    async checkStatus() {
        const token = localStorage.getItem('dashboard_token');
        const phone = localStorage.getItem('dashboard_phone') || localStorage.getItem('d_phone');

        if (token) {
            try {
                const res = await fetch('/api/premium/check-status', {
                    headers: { 'Authorization': token }
                });
                const data = await res.json();
                this.isPro = data.is_pro;
            } catch (e) {
                console.error("Pro check failed:", e);
            }
        } else if (phone) {
            await this.checkByPhone(phone);
        }
    },

    async checkByPhone(phone) {
        try {
            const res = await fetch(`/api/check-pro?phone=${phone}`);
            const data = await res.json();
            this.isPro = data.is_pro;
        } catch (e) { }
    },

    listenForPhoneChange() {
        const phoneInput = document.getElementById('phone');
        if (phoneInput) {
            phoneInput.addEventListener('change', async () => {
                const val = phoneInput.value.replace(/\D/g, '');
                if (val.length >= 9) {
                    await this.checkByPhone(val);
                    this.renderPremiumElements();
                }
            });
        }
    },

    injectCSS() {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/premium/premium.css'; // This needs to be served
        document.head.appendChild(link);
    },

    renderPremiumElements() {
        // Clear existing
        document.querySelectorAll('.premium-badge, .pro-banner, .pro-btn-extra').forEach(el => el.remove());

        // 1. Add badge to profile
        const profileName = document.getElementById('nav_user_fish');
        if (profileName && this.isPro) {
            const badge = document.createElement('span');
            badge.className = 'premium-badge';
            badge.innerHTML = '<i class="fas fa-crown"></i> PRO';
            profileName.after(badge);
        }

        // 2. Add "Generate Notice" button and "Pro Analytics" in school view if Pro (Dashboard)
        const schoolView = document.getElementById('schoolView');
        if (schoolView && this.isPro) {
            const container = schoolView.querySelector('.controls');
            if (container) {
                const btnGroup = document.createElement('div');
                btnGroup.className = 'filter-group pro-btn-extra';
                btnGroup.style.display = 'flex';
                btnGroup.style.gap = '10px';
                btnGroup.innerHTML = `
                    <button class="pro-btn" onclick="PremiumUI.showNoticeModal()"><i class="fas fa-file-pdf"></i> 3-Ilova</button>
                    <button class="pro-btn" style="background:#6366f1; color:white !important" onclick="PremiumUI.showAnalytics()"><i class="fas fa-brain"></i> Pro Analitika</button>
                `;
                container.after(btnGroup);
            }
        }
    },

    setupModal() {
        // Marketing modal removed as per user request
    },

    showModal() {
        // Marketing modal removed
    },

    showAnalytics() {
        // Analytics modal content (for existing PRO users)
        const modal = document.getElementById('premiumModal');
        if (!modal) {
            // If modal doesn't exist, create a basic container for analytics
            this.createAnalyticsContainer();
        }
        document.getElementById('modalContentDefault').style.display = 'none';
        document.getElementById('modalContentAnalytics').style.display = 'block';
        document.getElementById('premiumModal').style.display = 'block';
        this.loadAnalytics();
    },

    createAnalyticsContainer() {
        const modal = document.createElement('div');
        modal.className = 'premium-modal';
        modal.id = 'premiumModal';
        modal.innerHTML = `
            <div class="premium-modal-content">
                <span class="close-modal" onclick="PremiumUI.hideModal()">&times;</span>
                <div id="modalContentDefault" style="display:none"></div>
                <div id="modalContentAnalytics">
                    <h2 style="color:#ffd700"><i class="fas fa-brain"></i> Pro Analitika</h2>
                    <div id="analyticsBody" style="text-align:left; margin-top:20px; max-height:400px; overflow-y:auto;">
                        <div class="loader"><i class="fas fa-spinner fa-spin"></i> Tahlil qilinmoqda...</div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    },

    showNoticeModal() {
        if (confirm("Bugun uchun sababsiz kelmagan o'quvchilar ro'yxati asosida Bildirishnoma (3-Ilova) yaratilsinmi?")) {
            this.generateNotice();
        }
    },

    async loadAnalytics() {
        const body = document.getElementById('analyticsBody');
        const token = localStorage.getItem('dashboard_token');

        try {
            // 1. Red List
            const redRes = await fetch('/api/premium/red-list', { headers: { 'Authorization': token } });
            const redList = await redRes.json();

            // 2. AI Patterns
            const patRes = await fetch('/api/premium/patterns', { headers: { 'Authorization': token } });
            const patData = await patRes.json();

            let html = `
                <div style="margin-bottom:25px; background:rgba(244,63,94,0.1); padding:15px; border-radius:12px; border:1px solid rgba(244,63,94,0.2)">
                    <h4 style="color:#f43f5e; margin:0 0 10px 0"><i class="fas fa-user-clock"></i> Haftalik Qizil Ro'yxat</h4>
                    ${redList.length > 0 ? redList.map(s => `<p style="margin:5px 0; font-size:0.9rem">• <b>${s.name}</b> (${s.class}) - ${s.absent_count} kun</p>`).join('') : '<p style="font-size:0.85rem; color:#94a3b8">Bunday o\'quvchilar aniqlanmadi.</p>'}
                </div>
                
                <div style="margin-bottom:25px; background:rgba(99,102,241,0.1); padding:15px; border-radius:12px; border:1px solid rgba(99,102,241,0.2)">
                    <h4 style="color:#818cf8; margin:0 0 10px 0"><i class="fas fa-robot"></i> AI Tahlil (Patternlar)</h4>
                    <p style="font-size:0.9rem; line-height:1.5">${patData.insights ? patData.insights.replace(/\n/g, '<br>') : "Ma'lumotlar tahlil qilinmoqda..."}</p>
                </div>
            `;
            body.innerHTML = html;
        } catch (e) {
            body.innerHTML = '<p style="color:#ef4444">Tahlil yuklashda xatolik yuz berdi.</p>';
        }
    },

    hideModal() {
        document.getElementById('premiumModal').style.display = 'none';
    },

    pay() {
        alert("To'lov tizimi tez orada ishga tushadi. Faollashtirish uchun @admin bilan bog'laning.");
    },

    async generateNotice() {
        const token = localStorage.getItem('dashboard_token');
        const district = localStorage.getItem('dashboard_district');
        const school = localStorage.getItem('dashboard_school');

        // Fetch current day's absentees
        try {
            const absRes = await fetch(`/api/stats/absentees?date=${new Date().toISOString().split('T')[0]}`, {
                headers: { 'Authorization': token }
            });
            const allAbs = await absRes.json();
            const myAbs = allAbs.filter(a => a.school === school);

            if (myAbs.length === 0) {
                return alert("Bugun uchun sababsiz kelmagan o'quvchilar yo'q.");
            }

            // Map and send request
            const students = myAbs.map(s => ({
                name: s.student_name,
                class: s.class,
                address: s.address || 'Kiritilmagan',
                parent_phone: s.parent_phone || 'Kiritilmagan'
            }));

            const res = await fetch('/api/premium/generate-notice', {
                method: 'POST',
                headers: {
                    'Authorization': token,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    district,
                    school,
                    students,
                    fio: localStorage.getItem('dashboard_fio')
                })
            });

            if (res.ok) {
                const blob = await res.blob();
                const url = window.URL.createObjectURL(blob);
                const a = document.createElement('a');
                a.href = url;
                a.download = `Bildirishnoma_${school}.pdf`;
                document.body.appendChild(a);
                a.click();
                a.remove();
            } else {
                const err = await res.json();
                alert(err.error);
            }
        } catch (e) {
            console.error(e);
            alert("Xatolik yuz berdi");
        }
    }
};

document.addEventListener('DOMContentLoaded', () => PremiumUI.init());
