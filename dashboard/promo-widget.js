// Between Us Corner Promo Widget with Smooth Slidebar
(function() {
    if (document.getElementById('betweenus-promo-widget')) return;

    // Inject Styles
    const style = document.createElement('style');
    style.id = 'betweenus-promo-styles';
    style.textContent = `
        .bu-promo-container {
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 999999;
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
            transition: transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), opacity 0.3s ease;
        }
        .bu-promo-container.bu-slide-collapsed {
            transform: translateX(calc(100% + 40px));
            pointer-events: none;
        }
        .bu-promo-card {
            background: rgba(15, 23, 42, 0.92);
            backdrop-filter: blur(18px);
            -webkit-backdrop-filter: blur(18px);
            border: 1px solid rgba(255, 255, 255, 0.18);
            border-radius: 18px;
            box-shadow: 0 15px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(99, 102, 241, 0.25);
            padding: 15px 18px;
            width: 280px;
            color: #ffffff;
            position: relative;
        }
        .bu-promo-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            margin-bottom: 8px;
        }
        .bu-badge {
            font-size: 10px;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            background: linear-gradient(135deg, #6366f1, #a855f7);
            color: #fff;
            padding: 2px 8px;
            border-radius: 10px;
            font-weight: 700;
        }
        .bu-close-btn {
            background: rgba(255, 255, 255, 0.08);
            border: 1px solid rgba(255, 255, 255, 0.15);
            color: #cbd5e1;
            cursor: pointer;
            font-size: 14px;
            line-height: 1;
            width: 24px;
            height: 24px;
            display: flex;
            align-items: center;
            justify-content: center;
            border-radius: 50%;
            transition: all 0.2s ease;
        }
        .bu-close-btn:hover {
            color: #fff;
            background: rgba(239, 68, 68, 0.6);
            border-color: #ef4444;
            transform: scale(1.1);
        }
        .bu-title {
            font-size: 15px;
            font-weight: 700;
            margin-bottom: 4px;
            display: flex;
            align-items: center;
            gap: 6px;
            color: #f8fafc;
        }
        .bu-desc {
            font-size: 12px;
            color: #cbd5e1;
            margin-bottom: 12px;
            line-height: 1.4;
        }
        .bu-buttons {
            display: flex;
            gap: 8px;
        }
        .bu-btn {
            flex: 1;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            gap: 6px;
            padding: 8px 12px;
            font-size: 12px;
            font-weight: 600;
            text-decoration: none;
            border-radius: 10px;
            transition: all 0.2s ease;
            box-shadow: 0 4px 12px rgba(0,0,0,0.2);
        }
        .bu-btn:hover {
            transform: translateY(-2px);
            filter: brightness(1.1);
        }
        .bu-btn-tg {
            background: linear-gradient(135deg, #0088cc, #229ED9);
            color: #ffffff !important;
        }
        .bu-btn-ig {
            background: linear-gradient(135deg, #833ab4, #fd1d1d, #fcb045);
            color: #ffffff !important;
        }
        .bu-btn svg {
            width: 15px;
            height: 15px;
            fill: currentColor;
        }

        /* Slidebar Edge Opener Tab */
        .bu-slide-tab {
            position: fixed;
            right: 0;
            bottom: 30px;
            z-index: 999998;
            background: linear-gradient(135deg, #1e1b4b, #312e81);
            border: 1px solid rgba(129, 140, 248, 0.4);
            border-right: none;
            border-radius: 20px 0 0 20px;
            padding: 8px 14px 8px 10px;
            color: #e0e7ff;
            cursor: pointer;
            box-shadow: -4px 6px 20px rgba(0,0,0,0.4);
            display: flex;
            align-items: center;
            gap: 8px;
            font-size: 12px;
            font-weight: 700;
            transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
            transform: translateX(100%);
            opacity: 0;
            pointer-events: none;
        }
        .bu-slide-tab.bu-tab-visible {
            transform: translateX(0);
            opacity: 1;
            pointer-events: auto;
        }
        .bu-slide-tab:hover {
            padding-left: 14px;
            background: linear-gradient(135deg, #312e81, #4338ca);
            color: #fff;
            box-shadow: -6px 8px 25px rgba(99, 102, 241, 0.5);
        }

        @media (max-width: 640px) {
            .bu-promo-container {
                bottom: 14px;
                right: 14px;
            }
            .bu-promo-card {
                width: 250px;
                padding: 12px 14px;
            }
            .bu-slide-tab {
                bottom: 20px;
                font-size: 11px;
                padding: 6px 10px 6px 8px;
            }
        }
    `;
    document.head.appendChild(style);

    // Create DOM element
    const container = document.createElement('div');
    container.id = 'betweenus-promo-widget';
    container.className = 'bu-promo-container';

    // SVG icons
    const tgIcon = `<svg viewBox="0 0 24 24"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm4.64 6.8c-.15 1.58-.8 5.42-1.13 7.19-.14.75-.42 1-.68 1.03-.58.05-1.02-.38-1.58-.75-.88-.58-1.38-.94-2.23-1.5-.99-.65-.35-1.01.22-1.59.15-.15 2.71-2.48 2.76-2.69a.2.2 0 00-.05-.18c-.06-.05-.14-.03-.21-.02-.09.02-1.49.95-4.22 2.79-.4.27-.76.41-1.08.4-.36-.01-1.04-.2-1.55-.37-.63-.2-1.12-.31-1.08-.66.02-.18.27-.36.74-.55 2.92-1.27 4.86-2.11 5.83-2.51 2.78-1.16 3.35-1.36 3.73-1.36.08 0 .27.02.39.12.1.08.13.19.14.27-.01.06.01.24 0 .38z"/></svg>`;
    const igIcon = `<svg viewBox="0 0 24 24"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>`;

    container.innerHTML = `
        <div class="bu-promo-card" id="bu-card">
            <div class="bu-promo-header">
                <span class="bu-badge">Reklama / Hamkor</span>
                <button class="bu-close-btn" id="bu-close-btn" title="Chetga yashirish (Slide)">✕</button>
            </div>
            <div class="bu-title">
                ✨ Between Us
            </div>
            <div class="bu-desc">
                Rasmiy sahifalarimizga obuna bo'ling:
            </div>
            <div class="bu-buttons">
                <a href="https://t.me/Between_Us_uzb" target="_blank" rel="noopener noreferrer" class="bu-btn bu-btn-tg">
                    ${tgIcon} Telegram
                </a>
                <a href="https://www.instagram.com/betweenusuzb/" target="_blank" rel="noopener noreferrer" class="bu-btn bu-btn-ig">
                    ${igIcon} Instagram
                </a>
            </div>
        </div>
    `;

    // Slide tab element (Chetda qoluvchi tugma)
    const slideTab = document.createElement('div');
    slideTab.id = 'bu-slide-tab';
    slideTab.className = 'bu-slide-tab';
    slideTab.innerHTML = `<span>◀ ✨ Between Us</span>`;
    slideTab.title = "Between Us reklamasini ochish";

    document.body.appendChild(container);
    document.body.appendChild(slideTab);

    const closeBtn = document.getElementById('bu-close-btn');

    function collapseToSlidebar() {
        container.classList.add('bu-slide-collapsed');
        slideTab.classList.add('bu-tab-visible');
        try { sessionStorage.setItem('bu_collapsed', 'true'); } catch(e){}
    }

    function expandFromSlidebar() {
        container.classList.remove('bu-slide-collapsed');
        slideTab.classList.remove('bu-tab-visible');
        try { sessionStorage.removeItem('bu_collapsed'); } catch(e){}
    }

    closeBtn.addEventListener('click', function(e) {
        e.stopPropagation();
        collapseToSlidebar();
    });

    slideTab.addEventListener('click', function(e) {
        e.stopPropagation();
        expandFromSlidebar();
    });

    // Check if previously collapsed in this session
    try {
        if (sessionStorage.getItem('bu_collapsed') === 'true') {
            collapseToSlidebar();
        }
    } catch(e){}
})();
