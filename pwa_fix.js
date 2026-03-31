const fs = require('fs');
const files = [
  'C:/Users/Manaviyat2/.gemini/antigravity/scratch/31.03.2024/dashboard/index.html',
  'C:/Users/Manaviyat2/.gemini/antigravity/scratch/31.03.2024/dashboard/davomat.html',
  'C:/Users/Manaviyat2/.gemini/antigravity/scratch/31.03.2024/dashboard/admin.html',
  'C:/Users/Manaviyat2/.gemini/antigravity/scratch/31.03.2024/dashboard/dashboard.html'
];

const pwaHead = `  <link rel="manifest" href="manifest.json">
  <meta name="theme-color" content="#6366f1">
  <meta name="apple-mobile-web-app-capable" content="yes">
  <meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">
  <link rel="apple-touch-icon" href="/assets/icon-192.png">`;

const pwaScript = `
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').then(reg => {
        console.log('PWA ServiceWorker registered');
      }).catch(err => console.log('SW registration failed:', err));
    });
  }
`;

files.forEach(f => {
    if (fs.existsSync(f)) {
        let content = fs.readFileSync(f, 'utf8');
        
        // Add to head
        if (!content.includes('rel="manifest"')) {
            content = content.replace('</head>', pwaHead + '</head>');
        }
        
        // Add before closing body
        if (!content.includes('serviceWorker')) {
            content = content.replace('</body>', '<script>' + pwaScript + '</script></body>');
        }
        
        fs.writeFileSync(f, content);
        console.log(`PWA support added to ${f}`);
    }
});
