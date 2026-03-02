// ------------------------------------------------------------------
// 1. Configuration & Global State
// ------------------------------------------------------------------
// !!! 카카오 디벨로퍼스에서 발급받은 'JavaScript 키'를 아래에 넣으세요 !!!
try {
    if (window.Kakao && !window.Kakao.isInitialized()) {
        window.Kakao.init('f36810396616a494fcc94b271ab7e2ed'); // 예: '1234567890abcdef...'
        console.log("Kakao SDK Initialized");
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

// Character Image Mapping
// 파일명과 매칭되는 키워드 설정 (한글 깨짐 방지)
const characterImages = {
    '카마도 탄지로': './images/tanjiro.png',
    '탄지로': './images/tanjiro.png',
    '카마도 네즈코': './images/nezuko.png',
    '네즈코': './images/nezuko.png',
    '키부츠지 무잔': './images/mujan.png',
    '무잔': './images/mujan.png',
    '아가츠마 젠이츠': './images/zenitsu.png',
    '젠이츠': './images/zenitsu.png',
    '하시비라 이노스케': './images/inosuke.png',
    '이노스케': './images/inosuke.png',
    '우부야시키 카가야': './images/kagaya.png',
    '카가야': './images/kagaya.png',
    '토미오카 기유': './images/giyu.png',
    '기유': './images/giyu.png',
    '렌고쿠 쿄쥬로': './images/rengoku.png',
    '렌고쿠': './images/rengoku.png',
    '코쵸우 시노부': './images/shinobu.png',
    '시노부': './images/shinobu.png',
    '츠유리 카나오': './images/kanao.png',
    '카나오': './images/kanao.png',
    '히메지마 교메이': './images/gyomei.png',
    '교메이': './images/gyomei.png',
    '시나즈가와 사네미': './images/sanemi.png',
    '사네미': './images/sanemi.png',
    '시나즈가와 겐야': './images/genya.png',
    '겐야': './images/genya.png',
    '이구로 오바나이': './images/obanai.png',
    '오바나이': './images/obanai.png',
    '토키토 무이치로': './images/muichiro.png',
    '무이치로': './images/muichiro.png',
    '칸로지 미츠리': './images/mitsuri.png',
    '미츠리': './images/mitsuri.png',
    '우즈이 텐겐': './images/tengen.png',
    '텐겐': './images/tengen.png',
    '타마요': './images/tamayo.png',
    '유시로': './images/yushiro.png',
    '코쿠시보': './images/kokushibo.png',
    '도우마': './images/douma.png',
    '아카자': './images/akaza.png',
    '굣코': './images/gyokko.png',
    '다키': './images/daki.png',
    '조하쿠텐': './images/zohakuten.png',
    '규타로': './images/gyutaro.png',
    '나키메': './images/nakime.png',
    '카이가쿠': './images/kaigaku.png',
    '엔무': './images/enmu.png',
    '루이': './images/rui.png',
    'default': './images/giyu.png' // 기본값은 기유로 설정 (이미지가 3개뿐이므로)
};

function getCharacterImage(text) {
    // 테스트를 위해 모든 이미지를 default.png로 고정합니다. (나중에 복구 가능)
    return './images/default.png';
    /*
    let imgUrl = characterImages['default'];
    // 텍스트에 키워드가 포함되어 있는지 확인
    for (const [key, url] of Object.entries(characterImages)) {
        if (key !== 'default' && text && text.includes(key)) {
            // 해당 이미지가 실제로 존재하는지 체크할 수는 없으나, 
            // 현재 프로젝트 구조상 tanjiro, giyu, mujan만 존재함.
            // 없는 이미지를 호출하면 엑박이 뜨므로, 존재하는 것만 매핑하거나
            // 이미지가 없는 캐릭터가 나오면 default로 돌리는 로직이 필요할 수 있음.
            // 하지만 일단 매핑대로 반환.
            imgUrl = url;
            break;
        }
    }
    return imgUrl;
    */
}

// ------------------------------------------------------------------
// 3. Server API Interaction
// ------------------------------------------------------------------
// 스타일 테스트용 Mock 모드 (true로 설정하면 API를 호출하지 않음)
const MOCK_MODE = true;

async function analyzeDestiny(userInfo) {
    if (MOCK_MODE) {
        console.log("Mock Mode Enabled: Returning dummy data without calling API.");
        return new Promise((resolve) => {
            setTimeout(() => {
                resolve({
                    title: "차가운 흙 속에서 빛나는 예리한 보석",
                    character_name: "우부야시키 카가야", // 캐릭터 이름은 그대로 둠
                    description: "이서희님은 마치 차가운 흙 속에 묻혀있지만, 그 안에서 빛을 발하는 예리한 보석과 같습니다. 가장 강력한 토(土)의 기운은 이서희님에게 흔들림 없는 굳건함과 묵직한 안정감을 부여하며, 어떤 상황에서도 자신의 중심을 잃지 않게 합니다. 여기에 금(金)의 예리함과 섬세함이 더해져, 이서희님은 목표를 향해 감정을 배제한 채 오직 효율과 완벽을 추구하는 천재적인 면모를 지니고 있습니다. 겉으로는 차분하고 무심해 보일 수 있지만, 내면에는 누구보다 강한 집중력과 날카로운 통찰력을 품고 있습니다. 이러한 기질은 이서희님을 자신만의 길을 묵묵히 걸어가는 독보적인 존재로 만듭니다.",
                    chemistry: {
                        good: "렌고쿠 쿄쥬로 : 렌고쿠 쿄쥬로의 따뜻하고 긍정적인 태양 같은 기운은 이서희님의 예리한 금(金) 기운을 더욱 빛나게 하고, 묵직한 토(土) 기운에 생명력을 불어넣어 조화로운 시너지를 만들어낼 것입니다.",
                        bad: "시나즈가와 사네미 : 시나즈가와 사네미의 거칠고 파괴적인 무쇠 같은 기운은 이서희님의 섬세한 금(金) 기운과 충돌하여 서로에게 상처를 줄 수 있으며, 안정적인 토(土) 기운을 흔들어 불안정하게 만들 수 있습니다."
                    }
                });
            }, 1000); // 로딩 화면을 보기 위한 1초 대기
        });
    }

    try {
        console.log("Sending data to server:", { userInfo });
        const response = await fetch('/api/analyze', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ userInfo })
        });


        const data = await response.json();

        if (!response.ok) {
            console.error("Server Response Error:", data);
            throw new Error(data.error || `Server Error: ${response.status}`);
        }

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
// Load saved info from localStorage
window.addEventListener('DOMContentLoaded', () => {
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

    // Save to localStorage
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
    
    // Chemistry Text
    elements.chemGood.textContent = data.chemistry.good;
    elements.chemBad.textContent = data.chemistry.bad;
    
    // Card Rarity border color
    elements.photocard.setAttribute('data-rarity', rarity);

    // Main Image
    const mainImgUrl = getCharacterImage(data.character_name);
    playCharacterAnimation(mainImgUrl);

    // Chemistry Background Images (Good/Bad Compatibility)
    // 요청사항: Good/Bad 궁합의 배경에도 업로드 된 사진(여기서는 매칭된 캐릭터 이미지)을 넣기
    // 해석: 궁합 상대방의 이미지를 넣는 것이 일반적이나, 
    // 이미지가 없는 캐릭터가 많으므로 'Giyu'만 나오는 문제를 해결하기 위해
    // 매칭된 캐릭터의 이미지를 배경으로 쓸 수도 있음.
    // 하지만 우선은 '궁합 상대방'의 이미지를 찾고, 없으면 Main Character 이미지를 쓰는 대신
    // 기본값(Giyu)이 나오도록 설정함.
    
    const goodImgUrl = getCharacterImage(data.chemistry.good);
    const badImgUrl = getCharacterImage(data.chemistry.bad);
    
    const chemGoodBox = document.querySelector('.chem-item.good');
    const chemBadBox = document.querySelector('.chem-item.bad');
    
    // 배경 이미지 설정
    // html2canvas에서 background-blend-mode를 잘 지원하지 않으므로, 
    // css 대신 JS에서 linear-gradient를 함께 적용해 어두운 오버레이를 만듭니다.
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
    
    // 다운로드 버튼 상태 초기화
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
        const link = document.createElement('a');
        link.download = `${filenamePrefix}_${timestamp}.png`;
        link.href = canvas.toDataURL('image/png', 1.0);
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
    downloadSection(elements.photocard, 'DemonSlayer_Saju_Card', elements.btnDownloadCard);
});
elements.btnDownloadDesc.addEventListener('click', () => {
    downloadSection(document.querySelector('.saju-desc-box'), 'DemonSlayer_Saju_Desc', elements.btnDownloadDesc);
});
elements.btnDownloadGood.addEventListener('click', () => {
    downloadSection(document.querySelector('.chem-item.good'), 'DemonSlayer_Saju_GoodChem', elements.btnDownloadGood);
});
elements.btnDownloadBad.addEventListener('click', () => {
    downloadSection(document.querySelector('.chem-item.bad'), 'DemonSlayer_Saju_BadChem', elements.btnDownloadBad);
});

// Disable right-click / long-press save image on capture area
document.getElementById('capture-area').addEventListener('contextmenu', (e) => {
    e.preventDefault();
});

// ------------------------------------------------------------------
// 7. Animation Logic
// ------------------------------------------------------------------
let currentCharacterPngUrl = '';
let isAnimating = false;
let durationCache = {}; // WebP 재생 시간 캐싱

// WebP 파일의 바이너리 데이터를 읽어 애니메이션의 총 재생 시간(ms)을 계산하는 함수
async function getWebPAnimationDuration(url) {
    try {
        const response = await fetch(url);
        const buffer = await response.arrayBuffer();
        const dataView = new DataView(buffer);
        
        // Check RIFF header ('RIFF')
        if (dataView.getUint32(0) !== 0x52494646) return null; 
        // Check WEBP header ('WEBP')
        if (dataView.getUint32(8) !== 0x57454250) return null; 
        
        let offset = 12;
        let totalDuration = 0;
        let hasAnimation = false;

        while (offset < buffer.byteLength) {
            const chunkId = dataView.getUint32(offset);
            const chunkSize = dataView.getUint32(offset + 4, true); // Little endian
            
            // 'ANMF' (Animation Frame) chunk
            if (chunkId === 0x414E4D46) { 
                hasAnimation = true;
                // Frame Duration은 ANMF 청크 데이터의 12번째 바이트부터 3바이트(24-bit little endian)에 저장됨
                // 청크 헤더(8바이트) + 12 = 20
                const duration = dataView.getUint8(offset + 20) | 
                                (dataView.getUint8(offset + 21) << 8) | 
                                (dataView.getUint8(offset + 22) << 16);
                totalDuration += duration;
            }
            
            // Move to next chunk (Header 8 bytes + Size + 1 byte padding if size is odd)
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
    isAnimating = true;
    
    // WEBP 파일이 PNG 파일과 동일한 이름에 확장자만 .webp일 것이라고 가정합니다.
    const baseUrl = pngUrl.replace('.png', '.webp');
    const animUrl = baseUrl + '?t=' + new Date().getTime();
    
    elements.photocard.style.cursor = 'default'; // 클릭 불가 상태 표시
    
    // duration을 병렬로 구함 (캐시되어 있으면 즉시 반환)
    const getDuration = async () => {
        if (durationCache[baseUrl]) return durationCache[baseUrl];
        const dur = await getWebPAnimationDuration(baseUrl);
        if (dur) durationCache[baseUrl] = dur;
        return dur || 4000;
    };

    // onload 이벤트에서 타이머를 시작하여, 이미지가 실제로 화면에 로드된 시점부터 재생 시간을 계산함
    elements.characterImg.onload = async () => {
        elements.characterImg.onload = null; // 중복 실행 방지
        
        const duration = await getDuration();
        console.log(`WebP 재생 시간: ${duration}ms`);
        
        setTimeout(() => {
            // 이미지가 중간에 바뀌지 않았을 때만 PNG로 원복
            if (elements.characterImg.src.includes('?t=')) {
                elements.characterImg.src = pngUrl;
                isAnimating = false;
                elements.photocard.style.cursor = 'pointer'; // 클릭 기능 다시 활성화
            }
        }, duration);
    };
    
    // 즉시 이미지 src를 변경하여 다운로드 및 렌더링 시작 (await 블로킹 없음)
    elements.characterImg.src = animUrl;
}

// 포토카드 클릭 시 애니메이션 다시 재생
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
        // 1. 최신 Clipboard API 시도 (HTTPS 환경 필요)
        if (navigator.clipboard && window.isSecureContext) {
            await navigator.clipboard.writeText(pageUrl);
            alert('링크가 복사되었습니다!');
            return;
        }
        throw new Error('Clipboard API not available or not secure');
    } catch (err) {
        // 2. 모바일 브라우저나 HTTP 환경을 위한 Fallback (textarea 활용)
        try {
            const textArea = document.createElement("textarea");
            textArea.value = pageUrl;
            
            // 화면에 보이지 않게 처리
            textArea.style.position = "fixed";
            textArea.style.left = "-999999px";
            textArea.style.top = "-999999px";
            
            document.body.appendChild(textArea);
            
            // 모바일 iOS를 위한 선택 처리
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
            console.error('Fallback copy error:', fallbackErr);
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
            console.error('Kakao Init Error in click handler:', e);
            alert('카카오톡 공유 기능 초기화에 실패했습니다.\nJavaScript 키가 올바른지, 플랫폼(도메인) 등록이 되었는지 확인해주세요.');
            return;
        }
    }

    if (window.Kakao.isInitialized()) {
        window.Kakao.Share.sendDefault({
            objectType: 'feed',
            content: {
                title: '귀멸의 사주',
                description: '내 운명과 연결된 호흡은?',
                imageUrl: 'https://images.unsplash.com/photo-1534796636912-3b95b3ab5980?auto=format&fit=crop&q=80',
                link: {
                    mobileWebUrl: pageUrl,
                    webUrl: pageUrl,
                },
            },
        });
    } else {
        alert('카카오톡 공유 API가 아직 연결되지 않았습니다.');
    }
});

elements.btnShareFb.addEventListener('click', () => {
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`, '_blank', 'width=600,height=400');
});

elements.btnShareX.addEventListener('click', () => {
    const text = '귀멸의 사주 - 내 운명과 연결된 호흡은?';
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(pageUrl)}`, '_blank', 'width=600,height=400');
});
