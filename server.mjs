import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Solar, Lunar } from 'lunar-javascript';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs/promises';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/analyze', async (req, res) => {
    // console.log("분석 요청 수신됨..."); 
    try {
        const { userInfo, theme = 'kimetsu' } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("API 키가 없습니다!");
            return res.status(500).json({ error: "API 키 설정 오류" });
        }

        // 1. 생년월일시 파싱
        const [year, month, day] = userInfo.birthDate.split('-').map(Number);
        const [hour, minute] = userInfo.birthTime.split(':').map(Number);
        
        // 태어난 시간에서 32분 차감 (진태양시 보정 등)
        const dateObj = new Date(year, month - 1, day, hour, minute);
        dateObj.setMinutes(dateObj.getMinutes() - 32);

        const cYear = dateObj.getFullYear();
        const cMonth = dateObj.getMonth() + 1;
        const cDay = dateObj.getDate();
        const cHour = dateObj.getHours();
        const cMinute = dateObj.getMinutes();

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
        
        // 오행 및 천간/지진 한글 매핑
        const elementMap = { '木': '목', '火': '화', '土': '토', '金': '금', '水': '수' };
        const hanjaToHangul = {
            '甲': '갑', '乙': '을', '丙': '병', '丁': '정', '戊': '무', '己': '기', '庚': '경', '辛': '신', '壬': '임', '癸': '계',
            '子': '자', '丑': '축', '寅': '인', '卯': '묘', '辰': '진', '巳': '사', '午': '오', '未': '미', '申': '신', '酉': '유', '戌': '술', '亥': '해'
        };

        const getPillarData = (pillarType) => {
            const pillarHanja = eightChar[`get${pillarType === 'Hour' ? 'Time' : pillarType}`](); // e.g., "甲子"
            const wuXing = eightChar[`get${pillarType === 'Hour' ? 'Time' : pillarType}WuXing`](); // e.g., "木水"
            
            const ganHanja = pillarHanja.substring(0, 1);
            const zhiHanja = pillarHanja.substring(1, 2);
            
            const ganHangul = hanjaToHangul[ganHanja] || ganHanja;
            const zhiHangul = hanjaToHangul[zhiHanja] || zhiHanja;
            const pillarHangul = ganHangul + zhiHangul;

            const ganEl = elementMap[wuXing.substring(0, 1)] || wuXing.substring(0, 1);
            const zhiEl = elementMap[wuXing.substring(1, 2)] || wuXing.substring(1, 2);

            return {
                text: pillarHangul, // 한글 이름 (갑자)
                hanja: pillarHanja,  // 한자 이름 (甲子)
                element: `${ganEl}(${ganHangul}), ${zhiEl}(${zhiHangul})`,
                ganElement: ganEl,
                zhiElement: zhiEl
            };
        };

        const pillars = {
            year: getPillarData('Year'),
            month: getPillarData('Month'),
            day: getPillarData('Day'),
            hour: getPillarData('Hour')
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

        const fourPillars = `${pillars.year.text} ${pillars.month.text} ${pillars.day.text} ${pillars.hour.text}`;
        const fourPillarsHanja = `${pillars.year.hanja} ${pillars.month.hanja} ${pillars.day.hanja} ${pillars.hour.hanja}`;
        const ohaengInfo = `년주: ${pillars.year.element}, 월주: ${pillars.month.element}, 일주: ${pillars.day.element}, 시주: ${pillars.hour.element}`;
        const ohaengScoresStr = `목: ${ohaengScores['목']}점, 화: ${ohaengScores['화']}점, 토: ${ohaengScores['토']}점, 금: ${ohaengScores['금']}점, 수: ${ohaengScores['수']}점`;

        console.log(`계산된 사주: ${fourPillars}`);
        console.log(`계산된 사주(한자): ${fourPillarsHanja}`);
        console.log(`오행 정보: ${ohaengInfo}`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
            model: "gemini-3.1-flash-lite-preview",
            generationConfig: {
                temperature: 0.05, 
            }
        });

        // 테마에 맞는 프롬프트 동적 로드
        const promptTemplate = await fs.readFile(path.join(__dirname, 'prompts', `${theme}.txt`), 'utf-8');
        const prompt = promptTemplate
            .replace(/\{\{USER_NAME\}\}/g, userInfo.name)
            .replace(/\{\{FOUR_PILLARS\}\}/g, fourPillars)
            .replace(/\{\{FOUR_PILLARS_HANJA\}\}/g, fourPillarsHanja)
            .replace(/\{\{OHAENG_INFO\}\}/g, ohaengInfo)
            .replace(/\{\{OHAENG_SCORES\}\}/g, ohaengScoresStr);

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        // console.log("Gemini Raw Response:", text); // 디버깅용 로그 추가

        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            
            console.log(`\n============================`);
            console.log(`[캐릭터 매칭 사유]`);
            console.log(`주도 오행: ${jsonData.dominant_element}`);
            console.log(`십성: ${jsonData.sipsung}`);
            console.log(`추천 캐릭터: ${jsonData.character_name}`);
            console.log(`매칭 사유: ${jsonData.reason}`);
            console.log(`============================\n`);

            res.json(jsonData);
            // console.log("분석 완료 및 응답 전송 성공");
        } else {
            throw new Error("JSON 추출 실패");
        }

    } catch (error) {
        console.error("서버 에러 발생:", error);
        res.status(500).json({ error: "분석 중 에러가 발생했습니다." });
    }
});

app.listen(PORT, () => {
    console.log(`서버가 http://localhost:${PORT} 에서 정상 실행 중입니다.`);
});
