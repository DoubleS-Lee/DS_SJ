require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
const { calculateSaju, lunarToSolar } = require('@fullstackfamily/manseryeok');

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

// [중요] 에러를 일으켰던 listAvailableModels 함수와 호출 코드는 모두 삭제했습니다.

app.post('/api/analyze', async (req, res) => {
    console.log("분석 요청 수신됨..."); // 서버 터미널에서 확인용
    try {
        const { userInfo } = req.body;
        const apiKey = process.env.GEMINI_API_KEY;

        if (!apiKey) {
            console.error("API 키가 없습니다!");
            return res.status(500).json({ error: "API 키 설정 오류" });
        }

        // 사주 계산 (manseryeok-js 사용)
        const [year, month, day] = userInfo.birthDate.split('-').map(Number);
        const [hour, minute] = userInfo.birthTime.split(':').map(Number);
        
        let solarDate = { year, month, day };
        
        if (userInfo.calendarType === 'lunar') {
            const lunarConv = lunarToSolar(year, month, day, false); // 일단 평달로 처리
            solarDate = lunarConv.solar;
        }

        const saju = calculateSaju(solarDate.year, solarDate.month, solarDate.day, hour, minute);
        const fourPillars = `${saju.yearPillar} ${saju.monthPillar} ${saju.dayPillar} ${saju.hourPillar}`;
        const fourPillarsHanja = `${saju.yearPillarHanja} ${saju.monthPillarHanja} ${saju.dayPillarHanja} ${saju.hourPillarHanja}`;

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

        const prompt = `
        너는 '귀멸의 칼날' 세계관을 통달한 'AI 사주 분석가'야. 
        사용자의 이름: ${userInfo.name}, MBTI: ${userInfo.mbti}, 사주: ${fourPillars} (${fourPillarsHanja})를 분석해서 
        가장 잘 어울리는 캐릭터를 추천해줘. 반드시 JSON 형식으로만 답해줘.
        {
           "title": "한 줄 정의",
           "character_name": "캐릭터 이름",
           "description": "반말 스타일의 짧은 설명",
           "chemistry": { "good": "찰떡궁합", "bad": "상극" }
        }
        `;


        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();

        // JSON만 추출하여 파싱
        const jsonMatch = text.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
            const jsonData = JSON.parse(jsonMatch[0]);
            res.json(jsonData);
            console.log("분석 완료 및 응답 전송 성공");
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