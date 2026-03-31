const fs = require('fs');
const path = require('path');
const dir = 'C:\\\\Users\\\\Manaviyat2\\\\.gemini\\\\antigravity\\\\scratch\\\\31.03.2024\\\\dashboard';

// 1. Update index.html to show MMIBDO button
const indexPath = path.join(dir, 'index.html');
if (fs.existsSync(indexPath)) {
    let content = fs.readFileSync(indexPath, 'utf8');
    const target = `<a href="/inspektor.html" class="btn btn-secondary"`;
    const mmibdoBtn = `
            <a href="javascript:void(0)" onclick="alert('⚡ MMIBDO\\' Reyting tizimi\\nTez orada ishga tushiriladi!')" class="btn btn-secondary" 
                style="padding: 15px 30px; font-size: 1.1rem; border-radius: 12px; text-decoration: none; background: rgba(16,185,129,0.1); color: #10b981; border: 1px solid rgba(16,185,129,0.25); transition: 0.3s;">
                <i class="fas fa-star"></i> MMIBDO' Reyting
            </a>`;
    
    if (content.includes(target)) {
        content = content.replace(target, mmibdoBtn + target);
        fs.writeFileSync(indexPath, content);
    }
}

// 2. Update dashboard.html navbar
const dashPath = path.join(dir, 'dashboard.html');
if (fs.existsSync(dashPath)) {
    let content = fs.readFileSync(dashPath, 'utf8');
    const navMarker = `<a href="davomat.html" class="nav-link">`;
    const mmibdoNavLink = `
            <a href="javascript:void(0)" onclick="alert('⚡ MMIBDO\\' Reyting tizimi - Tez orada!')" class="nav-link" style="opacity: 0.7;">
                <i class="fas fa-star"></i><br>MMIBDO'
            </a>`;
            
    if (content.includes(navMarker)) {
        content = content.replace(navMarker, mmibdoNavLink + navMarker);
        fs.writeFileSync(dashPath, content);
    }
}

console.log("MMIBDO' Rating placeholder added securely.");
