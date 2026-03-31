const fs = require('fs');
const path = require('path');

const dir = 'C:\\Users\\Manaviyat2\\.gemini\\antigravity\\scratch\\31.03.2024\\dashboard';

// 1. Fix index.html terminology and visibility
const indexPath = path.join(dir, 'index.html');
if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    
    // Fix Mixed Script
    content = content.replace(/PRO Versiya билан ишингизни енгиллатинг/g, "PRO Versiya bilan ishingizni yengillating");
    
    // Hide card info behind a toggle in index.html PRO Section
    const oldPaymentBox = `<div style="background: rgba(255,255,255,0.05); padding: 15px; border-radius: 15px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.1);">
                    <p style="margin:0; font-size: 0.85rem; color: #facc15; font-weight: 600;">To'lov ma'lumotlari:</p>
                    <p style="margin:5px 0 0; font-size: 1.1rem; color: #fff; font-family: monospace;">6262 5707 8542 8618</p>
                    <p style="margin:5px 0 0; font-size: 0.9rem; color: #94a3b8;">Narxi: <b>25 000 so'm</b> / oyiga</p>
                </div>`;
    
    const newPaymentBox = `<div id="paymentDetails" style="display:none; background: rgba(255,255,255,0.05); padding: 20px; border-radius: 20px; margin-bottom: 25px; border: 1px solid rgba(255,255,255,0.1); animation: fadeIn 0.5s;">
                    <p style="margin:0; font-size: 0.85rem; color: #facc15; font-weight: 600;">To'lov ma'lumotlari:</p>
                    <p style="margin:10px 0; font-size: 1.3rem; color: #fff; font-family: monospace; letter-spacing: 2px;">6262 5707 8542 8618</p>
                    <p style="margin:5px 0 0; font-size: 0.95rem; color: #cbd5e1;">Narxi: <b>25 000 so'm</b> / oyiga</p>
                </div>
                <style>@keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }</style>`;
    
    if (content.includes(oldPaymentBox)) {
        content = content.replace(oldPaymentBox, newPaymentBox);
        content = content.replace('PRO-ga o\'tish', 'Ohalobuna (PRO)');
        // Change button to toggle
        content = content.replace('href="https://t.me/ferghanaregdavomat_bot?start=pro"', 'href="javascript:void(0)" onclick="document.getElementById(\'paymentDetails\').style.display=\'block\'; this.style.display=\'none\';"');
    }
    
    fs.writeFileSync(indexPath, content);
}

// 2. Fix davomat.html success screen visibility
const davPath = path.join(dir, 'davomat.html');
if (fs.existsSync(davPath)) {
    let content = fs.readFileSync(davPath, 'utf8');
    const oldPromo = `<div id="proPromoSuccess" style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; text-align: left;">
                <p style="color: #facc15; font-size: 0.85rem; font-weight: 600; margin-bottom: 8px;"><i class="fas fa-crown"></i> PRO-GA O'TING:</p>
                <div style="margin-bottom: 12px; border-bottom: 1px solid rgba(255,255,255,0.05); padding-bottom: 10px;">
                    <p style="margin:0; font-size: 0.9rem; color: #fff; font-family: monospace;">6262 5707 8542 8618</p>
                    <p style="margin:3px 0 0; font-size: 0.75rem; color: #94a3b8;">Narxi: 25 000 so'm / oyiga</p>
                </div>
                <button onclick="location.href='https://t.me/ferghanaregdavomat_bot'" class="btn" style="padding: 8px 15px; font-size: 0.8rem; background: #6366f1; width: 100%; border-radius: 8px;">
                    <i class="fas fa-receipt"></i> To'lovni tasdiqlash
                </button>
            </div>`;
            
    const newPromo = `<div id="proPromoSuccess" style="margin-top: 20px; padding: 15px; background: rgba(255, 255, 255, 0.05); border: 1px solid rgba(255, 255, 255, 0.1); border-radius: 12px; text-align: center;">
                <p style="color: #facc15; font-size: 0.85rem; font-weight: 600; margin-bottom: 12px;"><i class="fas fa-crown"></i> PRO-GA O'TISH</p>
                <button onclick="location.href='dashboard.html#profile'" class="btn btn-pro" style="padding: 10px 20px; font-size: 0.8rem; width:100%;">
                    To'lov ma'lumotlarini ko'rish
                </button>
            </div>`;
    
    if (content.includes(oldPromo)) {
        content = content.replace(oldPromo, newPromo);
    }
    fs.writeFileSync(davPath, content);
}

// 3. Fix dashboard.html card and visibility
const dashPath = path.join(dir, 'dashboard.html');
if (fs.existsSync(dashPath)) {
    let content = fs.readFileSync(dashPath, 'utf8');
    
    // Update realistic card data
    content = content.replace(/9860 1234 5678 9012/g, "6262 5707 8542 8618");
    content = content.replace(/M. RUSTAMOV/g, "DAVOMAT PRO");
    
    fs.writeFileSync(dashPath, content);
}

console.log("Fixed mixed terminology and restricted card visibility to purchase actions only.");
