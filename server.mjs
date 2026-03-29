import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { Solar, Lunar } from 'lunar-javascript';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 캐릭터 데이터 서버 시작 시 캐싱
const characterCache = {};
const themes = ['kimetsu', 'onepiece', 'shingeki'];
for (const theme of themes) {
    const raw = await fs.readFile(path.join(__dirname, 'data', `${theme}_characters.json`), 'utf-8');
    characterCache[theme] = JSON.parse(raw);
}
console.log(`[캐릭터 데이터 캐싱 완료] ${themes.join(', ')}`);

// ------------------------------------------------------------------
// 사주 계산 헬퍼 함수
// ------------------------------------------------------------------
const elementMap = { '木': '목', '火': '화', '土': '토', '金': '금', '水': '수' };
const hanjaToHangul = {
    '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무', '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
    '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
};

function getPillarData(eightChar, pillarType) {
    const pillarHanja = eightChar[`get${pillarType === 'Hour' ? 'Time' : pillarType}`]();
    const wuXing = eightChar[`get${pillarType === 'Hour' ? 'Time' : pillarType}WuXing`]();

    const ganHanja = pillarHanja.substring(0, 1);
    const zhiHanja = pillarHanja.substring(1, 2);

    const ganHangul = hanjaToHangul[ganHanja] || ganHanja;
    const zhiHangul = hanjaToHangul[zhiHanja] || zhiHanja;

    const ganEl = elementMap[wuXing.substring(0, 1)] || wuXing.substring(0, 1);
    const zhiEl = elementMap[wuXing.substring(1, 2)] || wuXing.substring(1, 2);

    return {
        text: ganHangul + zhiHangul,
        hanja: pillarHanja,
        element: `${ganEl}(${ganHangul}), ${zhiEl}(${zhiHangul})`,
        ganElement: ganEl,
        zhiElement: zhiEl
    };
}

function getBaseSipsung(dayElement, dominantElement) {
    if (dayElement === dominantElement) return '비겁';
    const sipsungMatrix = {
        '목': { '화': '식상', '토': '재성', '금': '관성', '수': '인성' },
        '화': { '토': '식상', '금': '재성', '수': '관성', '목': '인성' },
        '토': { '금': '식상', '수': '재성', '목': '관성', '화': '인성' },
        '금': { '수': '식상', '목': '재성', '화': '관성', '토': '인성' },
        '수': { '목': '식상', '화': '재성', '토': '관성', '금': '인성' }
    };
    return sipsungMatrix[dayElement][dominantElement];
}

function isYang(hanja) {
    return ['甲','丙','戊','庚','壬','子','寅','辰','午','申','戌'].includes(hanja);
}

// ------------------------------------------------------------------
// 미들웨어 설정
// ------------------------------------------------------------------
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/analyze', async (req, res) => {
    try {
        const { userInfo, theme = 'kimetsu' } = req.body;

        // 입력값 검증
        if (!userInfo || typeof userInfo !== 'object') {
            return res.status(400).json({ error: '잘못된 요청입니다.' });
        }
        if (!themes.includes(theme)) {
            return res.status(400).json({ error: '잘못된 테마입니다.' });
        }
        if (!/^\d{4}-\d{2}-\d{2}$/.test(userInfo.birthDate)) {
            return res.status(400).json({ error: '생년월일 형식이 올바르지 않습니다.' });
        }
        if (!/^\d{2}:\d{2}$/.test(userInfo.birthTime)) {
            return res.status(400).json({ error: '출생시간 형식이 올바르지 않습니다.' });
        }

        // 1. 생년월일시 파싱
        const [year, month, day] = userInfo.birthDate.split('-').map(Number);
        const [hour, minute] = userInfo.birthTime.split(':').map(Number);

        if (month < 1 || month > 12 || day < 1 || day > 31 || hour > 23 || minute > 59) {
            return res.status(400).json({ error: '날짜 또는 시간 값이 올바르지 않습니다.' });
        }

        // 태어난 시간에서 32분 차감 (진태양시 보정) - UTC 기준으로 계산하여 서버 타임존 무관
        const adjustedMs = Date.UTC(year, month - 1, day, hour, minute, 0) - (32 * 60 * 1000);
        const adjusted = new Date(adjustedMs);

        const cYear = adjusted.getUTCFullYear();
        const cMonth = adjusted.getUTCMonth() + 1;
        const cDay = adjusted.getUTCDate();
        const cHour = adjusted.getUTCHours();
        const cMinute = adjusted.getUTCMinutes();

        // console.log(`시간 보정 적용: ${hour}:${minute} -> ${cHour}:${cMinute} (-32분)`);

        // 2. 사주 계산 (보정된 시간 사용)
        let lunarDate;
        if (userInfo.calendarType === 'lunar') {
            lunarDate = Lunar.fromYmdHms(cYear, cMonth, cDay, cHour, cMinute, 0);
        } else {
            const solar = Solar.fromYmdHms(cYear, cMonth, cDay, cHour, cMinute, 0);
            lunarDate = solar.getLunar();
        }

        const eightChar = lunarDate.getEightChar();

        const pillars = {
            year: getPillarData(eightChar, 'Year'),
            month: getPillarData(eightChar, 'Month'),
            day: getPillarData(eightChar, 'Day'),
            hour: getPillarData(eightChar, 'Hour')
        };

        // 오행 점수 계산
        const ohaengScores = { '목': 0, '화': 0, '토': 0, '금': 0, '수': 0 };
        
        // 년주: 천간 5점 / 지지 5점
        if (ohaengScores[pillars.year.ganElement] !== undefined) ohaengScores[pillars.year.ganElement] += 5;
        if (ohaengScores[pillars.year.zhiElement] !== undefined) ohaengScores[pillars.year.zhiElement] += 5;
        
        // 월주: 천간 10점 / 지지 30점
        if (ohaengScores[pillars.month.ganElement] !== undefined) ohaengScores[pillars.month.ganElement] += 10;
        if (ohaengScores[pillars.month.zhiElement] !== undefined) ohaengScores[pillars.month.zhiElement] += 30;
        
        // 일주: 천간 20점 / 지지 15점
        if (ohaengScores[pillars.day.ganElement] !== undefined) ohaengScores[pillars.day.ganElement] += 20;
        if (ohaengScores[pillars.day.zhiElement] !== undefined) ohaengScores[pillars.day.zhiElement] += 15;
        
        // 시주: 천간 10점 / 지지 5점
        if (ohaengScores[pillars.hour.ganElement] !== undefined) ohaengScores[pillars.hour.ganElement] += 10;
        if (ohaengScores[pillars.hour.zhiElement] !== undefined) ohaengScores[pillars.hour.zhiElement] += 5;

        console.log(`\n============================`);
        console.log(`[오행 점수 계산 결과]`);
        console.log(`목(木): ${ohaengScores['목']}점 | 화(火): ${ohaengScores['화']}점 | 토(土): ${ohaengScores['토']}점 | 금(金): ${ohaengScores['금']}점 | 수(水): ${ohaengScores['수']}점`);
        console.log(`============================\n`);

        // 1. 일간(나의 본질) 오행 추출
        const myElement = pillars.day.ganElement; 

        // 2. 주도 오행(가장 점수가 높은 오행) 찾기
        const dominantElement = Object.keys(ohaengScores).reduce((a, b) => ohaengScores[a] > ohaengScores[b] ? a : b);

        const baseSipsung = getBaseSipsung(myElement, dominantElement);

        console.log(`[대분류 십성] 일간: ${myElement} | 주도 오행: ${dominantElement} | 도출: ${baseSipsung}`);

        // 일간(나)의 음양 확인
        const myPolarity = isYang(pillars.day.hanja.substring(0, 1)) ? '+' : '-';

        // 3. 주도 오행의 음양 파악 (사주 8글자 중 주도 오행에 해당하는 글자들의 양/음 개수 비교)
        let yangCount = 0; 
        let yinCount = 0;
        const allPillars = [pillars.year, pillars.month, pillars.day, pillars.hour];
        
        allPillars.forEach(p => {
            if (p.ganElement === dominantElement) {
                isYang(p.hanja.substring(0, 1)) ? yangCount++ : yinCount++;
            }
            if (p.zhiElement === dominantElement) {
                isYang(p.hanja.substring(1, 2)) ? yangCount++ : yinCount++;
            }
        });
        
        // 주도 오행의 최종 음양 (개수가 같으면 기본값으로 양(+) 부여)
        const dominantPolarity = (yangCount >= yinCount) ? '+' : '-';

        // 4. 일간과 주도 오행의 음양 대조하여 세부 10성 도출
        let exactSipsung = '';
        const isSamePolarity = (myPolarity === dominantPolarity); // 음양이 같으면 true (편/비/식), 다르면 false (정/겁/상)

        switch (baseSipsung) {
            case '비겁': exactSipsung = isSamePolarity ? '비견' : '겁재'; break;
            case '식상': exactSipsung = isSamePolarity ? '식신' : '상관'; break;
            case '재성': exactSipsung = isSamePolarity ? '편재' : '정재'; break;
            case '관성': exactSipsung = isSamePolarity ? '편관' : '정관'; break;
            case '인성': exactSipsung = isSamePolarity ? '편인' : '정인'; break;
        }

        console.log(`[최종 10성 계산] 나의 음양: ${myPolarity} | 주도 오행 음양: ${dominantPolarity} | 최종 십성: ${exactSipsung}`);
        console.log(`============================\n`);

        const fourPillars = `${pillars.year.text} ${pillars.month.text} ${pillars.day.text} ${pillars.hour.text}`;
        const fourPillarsHanja = `${pillars.year.hanja} ${pillars.month.hanja} ${pillars.day.hanja} ${pillars.hour.hanja}`;

        console.log(`계산된 사주: ${fourPillars} (${fourPillarsHanja})`);

        // 캐릭터 데이터 룩업
        const key = `${dominantElement}_${exactSipsung}`;
        const characters = characterCache[theme];
        if (!characters) {
            throw new Error(`'${theme}' 테마의 캐릭터 데이터가 없습니다.`);
        }
        const entry = characters[key];
        if (!entry) {
            throw new Error(`키 '${key}'에 해당하는 캐릭터가 없습니다.`);
        }

        const name = userInfo.name;
        const replaceN = (s) => s.replace(/\{\{USER_NAME\}\}/g, name);

        const jsonData = {
            character_name: entry.character_name,
            title: entry.title,
            description: replaceN(entry.description),
            dominant_element: dominantElement,
            sipsung: exactSipsung,
            chemistry: {
                good: replaceN(entry.chemistry.good),
                bad: replaceN(entry.chemistry.bad),
            },
            reason: key,
        };

        console.log(`\n============================`);
        console.log(`[캐릭터 매칭 결과]`);
        console.log(`주도 오행: ${dominantElement} | 십성: ${exactSipsung}`);
        console.log(`추천 캐릭터: ${jsonData.character_name}`);
        console.log(`============================\n`);

        res.json(jsonData);

    } catch (error) {
        console.error("서버 에러 발생:", error);
        res.status(500).json({ error: "분석 중 에러가 발생했습니다." });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 정상 실행 중입니다.`);
});
