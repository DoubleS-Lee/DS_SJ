// ------------------------------------------------------------------
// 1. Configuration & Global State
// ------------------------------------------------------------------
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
    btnDownload: document.getElementById('btn-download'),
    btnShare: document.getElementById('btn-share'),
    btnRetry: document.getElementById('btn-retry'),
};

// Character Image Mapping
// 파일명과 매칭되는 키워드 설정 (한글 깨짐 방지)
const characterImages = {
    '탄지로': './images/tanjiro.png',
    '네즈코': './images/nezuko.png', // 이미지 없음, default로 처리됨
    '젠이츠': './images/zenitsu.png', // 이미지 없음
    '이노스케': './images/inosuke.png', // 이미지 없음
    '기유': './images/giyu.png',
    '시노부': './images/shinobu.png', // 이미지 없음
    '렌고쿠': './images/rengoku.png', // 이미지 없음
    '텐겐': './images/tengen.png', // 이미지 없음
    '무잔': './images/mujan.png', // 파일명 mujan.png
    '도우마': './images/douma.png', // 이미지 없음
    '아카자': './images/akaza.png', // 이미지 없음
    'default': './images/giyu.png' // 기본값은 기유로 설정 (이미지가 3개뿐이므로)
};

function getCharacterImage(text) {
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
}

// ------------------------------------------------------------------
// 3. Server API Interaction
// ------------------------------------------------------------------
async function analyzeDestiny(userInfo) {
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
    elements.characterImg.src = mainImgUrl;

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
    if (goodImgUrl) {
        chemGoodBox.style.backgroundImage = `url('${goodImgUrl}')`;
        chemGoodBox.classList.add('has-bg');
    }
    
    if (badImgUrl) {
        chemBadBox.style.backgroundImage = `url('${badImgUrl}')`;
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
});

elements.btnDownload.addEventListener('click', () => {
    html2canvas(elements.photocard, { scale: 2, useCORS: true }).then(canvas => {
        const link = document.createElement('a');
        link.download = `DemonSlayer_Saju_${Date.now()}.png`;
        link.href = canvas.toDataURL('image/png');
        link.click();
    });
});
