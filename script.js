// ------------------------------------------------------------------
// 1. Configuration & Global State
// ------------------------------------------------------------------
// !!! 카카오 디벨로퍼스에서 발급받은 'JavaScript 키'를 아래에 넣으세요 !!!
try {
    if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init('f36810396616a494fcc94b271ab7e2ed'); // 예: '1234567890abcdef...'
        // console.log("Kakao SDK Initialized");
    } else if (!window.Kakao) {
        console.warn("Kakao SDK 로드 실패: 광고 차단기 등의 문제일 수 있습니다.");
    }
} catch (e) {
    console.error("Kakao SDK Initialization Error:", e);
}

const elements = {
    form: document.getElementById('saju-form'),
    inputSection: document.getElementById('input-section'),
    loadingSection: document.getElementById('loading-section'),
    resultSection: document.getElementById('result-section'),
    photocard: document.getElementById('photocard'),
    photocardContainer: document.getElementById('photocard-container'),
    characterImg: document.getElementById('character-img'),
    cardTitle: document.getElementById('card-title'),
    cardName: document.getElementById('card-name'),
    cardDesc: document.getElementById('card-desc'),
    chemGood: document.getElementById('chem-good'),
    chemBad: document.getElementById('chem-bad'),
    userInfoDisplay: document.getElementById('user-info-display'),
    btnDownloadCard: document.getElementById('btn-download-card'),
    btnDownloadDesc: document.getElementById('btn-download-desc'),
    btnDownloadGood: document.getElementById('btn-download-good'),
    btnDownloadBad: document.getElementById('btn-download-bad'),
    btnShareLink: document.getElementById('btn-share-link'),
    btnShareKakao: document.getElementById('btn-share-kakao'),
    btnShareFb: document.getElementById('btn-share-fb'),
    btnShareX: document.getElementById('btn-share-x'),
    btnRetry: document.getElementById('btn-retry'),
};

let themeData = {};
let characterImages = {};
let currentTheme = new URLSearchParams(window.location.search).get('theme') || 'kimetsu';

function getCharacterImage(text) {
    let imgUrl = characterImages['default'] || `./images/${currentTheme}/default.png`;
    for (const [key, url] of Object.entries(characterImages)) {
        if (key !== 'default' && text && text.includes(key)) {
            imgUrl = url;
            break;
        }
    }
    return imgUrl;
}

// ------------------------------------------------------------------
// 3. Server API Interaction
// ------------------------------------------------------------------
// 스타일 테스트용 Mock 모드 (true로 설정하면 API를 호출하지 않음)
// const MOCK_MODE = false;

async function analyzeDestiny(userInfo) {
    const cacheKey = `sajuCache_${userInfo.name}_${userInfo.birthDate}_${userInfo.birthTime}_${userInfo.calendarType}_${userInfo.gender}_${currentTheme}`;
    const cachedData = localStorage.getItem(cacheKey);

    if (cachedData) {
        // console.log("Returning cached result.");
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve(JSON.parse(cachedData));
            }, 800);
        });
    }

    /*
    if (MOCK_MODE) {
        console.log("Mock Mode Enabled: Returning dummy data without calling API.");
        return new Promise((resolve) => {
            setTimeout(() => {
                const mockData = {
                    title: "차가운 흙 속에서 빛나는 예리한 보석",
                    character_name: "우부야시키 카가야",
                    description: "테스트 데이터입니다. 가장 강력한 토(土)의 기운은 이서희님에게 흔들림 없는 굳건함과 묵직한 안정감을 부여하며...",
                    chemistry: {
                        good: "렌고쿠 쿄쥬로 : 좋은 인연입니다.",
                        bad: "시나즈가와 사네미 : 나쁜 인연입니다."
                    }
                };
                localStorage.setItem(cacheKey, JSON.stringify(mockData));
                resolve(mockData);
            }, 1000);
        });
    }
    */

    try {
        // console.log("Sending data to server:", { userInfo, theme: currentTheme });
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userInfo, theme: currentTheme })
        });

        const data = await response.json();

        if (!response.ok) {
            console.error("Server Response Error:", data);
            throw new Error(data.error || `Server Error: ${response.status}`);
        }

        localStorage.setItem(cacheKey, JSON.stringify(data));
        return data;
    } catch (error) {
        console.error("Analysis Error Detail:", error);
        alert(`분석 실패: ${error.message}\n(개발자 도구 콘솔을 확인해주세요)`);
        return null;
    }
}

// ------------------------------------------------------------------
// 4. Gacha System
// ------------------------------------------------------------------
function determineRarity() {
    const rand = Math.random() * 100;
    if (rand < 5) return 'UR';
    if (rand < 20) return 'SSR';
    if (rand < 50) return 'SR';
    return 'R';
}

// ------------------------------------------------------------------
// 5. Main UI Logic
// ------------------------------------------------------------------
window.addEventListener('DOMContentLoaded', async () => {
    // Theme setup
    try {
        document.body.classList.add(`theme-${currentTheme}`);
        const response = await fetch(`./data/${currentTheme}.json`);
        themeData = await response.json();
        
        // Character images mapping
        for (const [key, value] of Object.entries(themeData.characters)) {
            const ext = currentTheme === 'onepiece' ? 'jpg' : 'png';
            characterImages[key] = `./images/${currentTheme}/${value}.${ext}`;
        }
        // Apply theme texts
        document.querySelector('.main-header h1').textContent = themeData.texts.headerTitle;
        document.querySelector('.main-header p').textContent = themeData.texts.headerSubtitle;
        document.querySelector('#saju-form button').textContent = themeData.texts.btnSubmit;
        document.querySelector('#loading-section p').textContent = themeData.texts.loadingText;
        
        const copyEl = document.getElementById('copyright-text');
        if (copyEl) copyEl.textContent = themeData.copyright;

        // Apply theme colors (requires style.css to use these variables if needed, or inline)
        document.documentElement.style.setProperty('--primary', themeData.colors.primary);
        document.querySelector('.background-overlay').style.backgroundImage = themeData.colors.bgOverlayUrl;
        
        if (themeData.colors.loadingBgUrl) {
            const loadingSection = document.getElementById('loading-section');
            loadingSection.classList.add('loading-with-bg');
            loadingSection.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), ${themeData.colors.loadingBgUrl}`;
        }

        // Change title
        document.title = `${themeData.texts.headerTitle} 매칭`;

    } catch(e) {
        console.error("Theme load error:", e);
    }

    // Load saved info
    const savedInfo = JSON.parse(localStorage.getItem('userSajuInfo'));
    if (savedInfo) {
        document.getElementById('username').value = savedInfo.name || '';
        document.getElementById('birthdate').value = savedInfo.birthDate || '';
        document.getElementById('birthtime').value = savedInfo.birthTime || '';
        document.getElementById('calendar-type').value = savedInfo.calendarType || 'solar';
        document.getElementById('gender').value = savedInfo.gender || 'male';
    }
});

elements.form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const userInfo = {
        name: document.getElementById('username').value,
        birthDate: document.getElementById('birthdate').value,
        birthTime: document.getElementById('birthtime').value,
        calendarType: document.getElementById('calendar-type').value,
        gender: document.getElementById('gender').value
    };

    localStorage.setItem('userSajuInfo', JSON.stringify(userInfo));

    elements.inputSection.classList.add('hidden');
    elements.loadingSection.classList.remove('hidden');
    elements.userInfoDisplay.textContent = `${userInfo.name} / ${userInfo.birthDate.replace(/-/g, '.')}`;

    const resultData = await analyzeDestiny(userInfo);

    if (resultData) {
        const rarity = determineRarity();
        renderResult(resultData, rarity);
    } else {
        elements.loadingSection.classList.add('hidden');
        elements.inputSection.classList.remove('hidden');
    }
});

function renderResult(data, rarity) {
    elements.loadingSection.classList.add('hidden');
    elements.resultSection.classList.remove('hidden');

    elements.cardTitle.textContent = data.title;
    elements.cardName.textContent = data.character_name;
    elements.cardDesc.textContent = data.description;
    
    elements.chemGood.textContent = data.chemistry.good;
    elements.chemBad.textContent = data.chemistry.bad;
    
    elements.photocard.setAttribute('data-rarity', rarity);

    const mainImgUrl = getCharacterImage(data.character_name);
    playCharacterAnimation(mainImgUrl);
    
    const goodImgUrl = getCharacterImage(data.chemistry.good);
    const badImgUrl = getCharacterImage(data.chemistry.bad);
    
    const chemGoodBox = document.querySelector('.chem-item.good');
    const chemBadBox = document.querySelector('.chem-item.bad');
    
    if (goodImgUrl) {
        chemGoodBox.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${goodImgUrl}')`;
        chemGoodBox.classList.add('has-bg');
    }
    
    if (badImgUrl) {
        chemBadBox.style.backgroundImage = `linear-gradient(rgba(0,0,0,0.6), rgba(0,0,0,0.6)), url('${badImgUrl}')`;
        chemBadBox.classList.add('has-bg');
    }

    elements.resultSection.scrollIntoView({ behavior: 'smooth' });
}

// ------------------------------------------------------------------
// 6. Share & Save
// ------------------------------------------------------------------
elements.btnRetry.addEventListener('click', () => {
    elements.resultSection.classList.add('hidden');
    elements.inputSection.classList.remove('hidden');
    elements.form.reset();
    
    elements.btnDownloadCard.innerHTML = "캐릭터<br>카드";
    elements.btnDownloadDesc.innerHTML = "사주<br>해석";
    elements.btnDownloadGood.innerHTML = "Good<br>궁합";
    elements.btnDownloadBad.innerHTML = "Bad<br>궁합";
    [elements.btnDownloadCard, elements.btnDownloadDesc, elements.btnDownloadGood, elements.btnDownloadBad].forEach(btn => {
        btn.classList.remove('downloaded');
    });
});

async function downloadSection(element, filenamePrefix, buttonEl) {
    if (!element) return;
    
    const timestamp = Date.now();
    const originalText = buttonEl.innerHTML;
    buttonEl.innerHTML = "저장 중...";
    buttonEl.disabled = true;

    try {
        const canvas = await html2canvas(element, { 
            scale: 5, 
            useCORS: true,
            backgroundColor: '#0f0c29',
            allowTaint: true
        });

        const targetCanvas = document.createElement('canvas');
        targetCanvas.width = 800;
        targetCanvas.height = 800;
        const ctx = targetCanvas.getContext('2d');
        
        ctx.drawImage(canvas, 0, 0, canvas.width, canvas.height, 0, 0, 800, 800);

        const link = document.createElement('a');
        link.download = `${filenamePrefix}_${currentTheme}_${timestamp}.jpg`;
        link.href = targetCanvas.toDataURL('image/jpeg', 0.95);
        link.click();
        
        buttonEl.innerHTML = "다운<br>완료";
        buttonEl.classList.add('downloaded');
    } catch (err) {
        console.error("저장 중 오류 발생:", err);
        alert("이미지 저장에 실패했습니다.");
        buttonEl.innerHTML = originalText;
    }
    
    buttonEl.disabled = false;
}

elements.btnDownloadCard.addEventListener('click', () => {
    downloadSection(elements.photocard, 'Saju_Card', elements.btnDownloadCard);
});
elements.btnDownloadDesc.addEventListener('click', () => {
    downloadSection(document.querySelector('.saju-desc-box'), 'Saju_Desc', elements.btnDownloadDesc);
});
elements.btnDownloadGood.addEventListener('click', () => {
    downloadSection(document.querySelector('.chem-item.good'), 'Saju_GoodChem', elements.btnDownloadGood);
});
elements.btnDownloadBad.addEventListener('click', () => {
    downloadSection(document.querySelector('.chem-item.bad'), 'Saju_BadChem', elements.btnDownloadBad);
});

document.getElementById('capture-area').addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// ------------------------------------------------------------------
// 7. Animation Logic
// ------------------------------------------------------------------
let currentCharacterPngUrl = '';
let isAnimating = false;
let durationCache = {}; 

async function getWebPAnimationDuration(url) {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const dataView = new DataView(buffer);
        
        if (dataView.getUint32(0) !== 0x52494646) return null; 
        if (dataView.getUint32(8) !== 0x57454250) return null; 
        
        let offset = 12;
        let totalDuration = 0;
        let hasAnimation = false;

        while (offset < buffer.byteLength) {
            const chunkId = dataView.getUint32(offset);
            const chunkSize = dataView.getUint32(offset + 4, true); 
            
            if (chunkId === 0x414E4D46) { 
                hasAnimation = true;
                const duration = dataView.getUint8(offset + 20) | 
                                (dataView.getUint8(offset + 21) << 8) | 
                                (dataView.getUint8(offset + 22) << 16);
                totalDuration += duration;
            }
            offset += 8 + chunkSize + (chunkSize % 2);
        }
        return hasAnimation ? totalDuration : null;
    } catch(e) {
        console.error("WebP 재생 시간 추출 실패:", e);
        return null;
    }
}

function playCharacterAnimation(pngUrl) {
    if (isAnimating) return;
    
    currentCharacterPngUrl = pngUrl;
    
    if (currentTheme === 'onepiece') {
        elements.characterImg.src = pngUrl;
        return;
    }

    isAnimating = true;
    
    const baseUrl = pngUrl.replace('.png', '.webp');
    const animUrl = baseUrl + '?t=' + new Date().getTime();
    
    elements.photocard.style.cursor = 'default'; 
    
    const getDuration = async () => {
        if (durationCache[baseUrl]) return durationCache[baseUrl];
        const dur = await getWebPAnimationDuration(baseUrl);
        if (dur) durationCache[baseUrl] = dur;
        return dur || 4000;
    };

    elements.characterImg.onload = async () => {
        elements.characterImg.onload = null; 
        
        const duration = await getDuration();
        // console.log(`WebP 재생 시간: ${duration}ms`);
        
        setTimeout(() => {
            if (elements.characterImg.src.includes('?t=')) {
                elements.characterImg.src = pngUrl;
                isAnimating = false;
                elements.photocard.style.cursor = 'pointer'; 
            }
        }, duration);
    };
    
    elements.characterImg.src = animUrl;
}

elements.photocard.addEventListener('click', () => {
    if (currentCharacterPngUrl && !isAnimating) {
        playCharacterAnimation(currentCharacterPngUrl);
    }
});

// ------------------------------------------------------------------
// 8. Share functionality
// ------------------------------------------------------------------
const pageUrl = window.location.href;

elements.btnShareLink.addEventListener('click', async () => {
    try {
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(pageUrl);
            alert('링크가 복사되었습니다!');
            return;
        }
        throw new Error('Clipboard API not available');
    } catch (err) {
        try {
            const textArea = document.createElement("textarea");
            textArea.value = pageUrl;
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            document.body.appendChild(textArea);
            
            if (navigator.userAgent.match(/ipad|iphone/i)) {
                const range = document.createRange();
                range.selectNodeContents(textArea);
                const selection = window.getSelection();
                selection.removeAllRanges();
                selection.addRange(range);
                textArea.setSelectionRange(0, 999999);
            } else {
                textArea.select();
            }

            const successful = document.execCommand('copy');
            document.body.removeChild(textArea);
            
            if (successful) {
                alert('링크가 복사되었습니다!');
            } else {
                throw new Error('Fallback copy failed');
            }
        } catch (fallbackErr) {
            alert('링크 복사를 지원하지 않는 브라우저입니다.\n주소창의 링크를 직접 복사해주세요.');
        }
    }
});

elements.btnShareKakao.addEventListener('click', () => {
    if (!window.Kakao) {
        alert('카카오톡 공유 API를 불러올 수 없습니다.\n광고 차단기(AdBlock)를 사용 중이라면 해제 후 다시 시도해주세요.');
        return;
    }
    if (!window.Kakao.isInitialized()) {
        try {
            window.Kakao.init('f36810396616a494fcc94b271ab7e2ed');
        } catch (e) {
            alert('카카오톡 공유 기능 초기화에 실패했습니다.');
            return;
        }
    }

    if (window.Kakao.isInitialized()) {
        window.Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: themeData.texts?.headerTitle || '사주 분석',
                description: themeData.texts?.headerSubtitle || '내 운명과 연결된 캐릭터는?',
                imageUrl: `${window.location.origin}${window.location.pathname.replace(/[^\\/]+$/, '')}images/bg_${currentTheme}.jpg`,
                link: {
                    mobileWebUrl: pageUrl,
                    webUrl: pageUrl,
                },
            },
        });
    }
});

elements.btnShareFb.addEventListener('click', () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, '_blank', 'width=600,height=400');
});

elements.btnShareX.addEventListener('click', () => {
    const text = `${themeData.texts?.headerTitle || '사주 분석'} - ${themeData.texts?.headerSubtitle || ''}`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`, '_blank', 'width=600,height=400');
});
