import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { Solar, Lunar } from 'lunar-javascript';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

// 미들웨어 설정
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/analyze', async (req, res) => {
    console.log("분석 요청 수신됨..."); 
    try {
        const { userInfo } = req.body;
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

        console.log(`시간 보정 적용: ${hour}:${minute} -> ${cHour}:${cMinute} (-32분)`);

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
                element: `${ganEl}(${ganHangul}), ${zhiEl}(${zhiHangul})`
            };
        };

        const pillars = {
            year: getPillarData('Year'),
            month: getPillarData('Month'),
            day: getPillarData('Day'),
            hour: getPillarData('Hour')
        };

        const fourPillars = `${pillars.year.text} ${pillars.month.text} ${pillars.day.text} ${pillars.hour.text}`;
        const fourPillarsHanja = `${pillars.year.hanja} ${pillars.month.hanja} ${pillars.day.hanja} ${pillars.hour.hanja}`;
        const ohaengInfo = `년주: ${pillars.year.element}, 월주: ${pillars.month.element}, 일주: ${pillars.day.element}, 시주: ${pillars.hour.element}`;

        console.log(`계산된 사주: ${fourPillars}`);
        console.log(`계산된 사주(한자): ${fourPillarsHanja}`);
        console.log(`오행 정보: ${ohaengInfo}`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
                      model: "gemini-2.5-flash",
                        generationConfig: {
                            temperature: 0.1, 
                              }
                    });

    const prompt = `
        너는 '귀멸의 칼날' 세계관을 꿰뚫고 있는 AI 사주 분석가야.
        단순한 오행 개수 세기가 아니라, 아래의 **[정밀 가중치 계산법]**을 통해 ${userInfo.name}님의 기질을 심층 분석하고, 영혼이 가장 닮은 캐릭터를 매칭해줘.

        [${userInfo.name}님의 사주 정보]
        사주팔자: ${fourPillars} (${fourPillarsHanja})
        오행 구성: ${ohaengInfo}

        [분석 알고리즘 - 반드시 이 순서대로 사고할 것]
        
        **1단계: 오행 세력 정밀 계산 (Weighted Scoring)**
        입력된 네 개의 기둥(년/월/일/시)을 천간과 지지로 나누고, 아래 점수를 부여하여 가장 강력한 오행(Dominant Element)을 찾아라.
        - 년주(Year): 천간 5점 / 지지 5점 (가문, 배경)
        - 월주(Month): 천간 10점 / **지지 30점** (사회적 환경, 계절, 가장 중요!)
        - 일주(Day): **천간 20점** (본원, 나 자신) / **지지 15점** (배우자궁, 현실)
        - 시주(Time): 천간 10점 / 지지 5점 (말년, 숨겨진 무기)
        > *지시: 단순히 오행 개수가 많다고 강한 게 아니라, 월지와 일지를 장악한 오행이 진정한 핵심 기운임을 명심할 것.*

        **2단계: 선택과 집중 (낮은 점수 버리기)**
        사주의 8글자를 모두 설명하려 하지 마라. 1단계 계산을 통해 **가장 점수가 높은 핵심 기운(1~2개)만 뽑아서 해석**해라. 점수가 낮거나 비중이 적은 오행이나 특징은 과감히 버리고 절대 언급하지 마라.

        **3단계: 핵심 글자(Key Character) 분석**
        사주 전체 점수와 별개로, 아래 3글자의 특성을 최우선으로 해석에 반영하라.
        1. **일간(Day Stem, 20점):** 사용자의 본질적인 성격 (예: 병화면 태양, 임수면 바다).
        2. **월지(Month Branch, 30점):** 사용자가 살아가는 무대와 환경 (예: 전장, 훈련장, 평화로운 마을).
        3. **일지(Day Branch, 15점):** 사용자의 깔고 앉은 현실적 기반.

        **4단계: 귀멸의 칼날 캐릭터 매칭 (일관성 및 중복 배제)**
        위 분석 결과를 바탕으로 논리적 일관성을 지켜 캐릭터를 선정하라. (동일한 사주에는 반드시 동일한 메인 캐릭터가 도출되어야 함)
        - **캐릭터 종류:** 카마도 탄지로, 카마도 네즈코, 키부츠지 무잔, 아가츠마 젠이츠, 하시비라 이노스케, 우부야시키 카가야, 토미오카 기유, 렌고쿠 쿄쥬로, 코쵸우 시노부, 히메지마 교메이, 시나즈가와 사네미, 이구로 오바나이, 토키토 무이치로, 칸로지 미츠리, 우즈이 텐겐, 타마요, 유시로, 코쿠시보, 도우마, 아카자, 굣코, 다키, 한텐구, 규타로, 나키메, 카이가쿠, 엔무, 루이
        - **매칭 논리 예시:**
          * 월지(30점)가 자(子, 물)이고 일간이 병(丙, 불)이다 -> "차가운 겨울바다 위에 뜬 태양" -> 겉은 밝지만 속은 냉철하거나 외로운 서사를 가진 캐릭터.

        [작성 규칙]
        1. 내용 최적화: 모든 특징을 나열하지 말고, **가장 강력한 기질 딱 하나**만 집중적으로 설명해. 사주 해석을 캐릭터의 성격/행적과 연결하여 최소 5문장 임팩트 있게 작성.
        2. 표기 제한: 사주 용어는 '한글(한자)'로 표기하되, 가독성을 위해 **글 전체에서 한자 사용은 최대 1~2개**로 엄격히 제한해.
        3. 중복 금지: 'chemistry'의 good/bad에 들어가는 캐릭터는 메인 'character_name'에 나온 캐릭터와 **절대 겹쳐서는 안 되며**, 반드시 서로 다른 3명의 캐릭터가 출력되어야 해.
        4. 말투: '~입니다', '~합니다' 체의 잘 설명해주는 말투. 반드시 '사용자'나 '사용자님'이라는 단어 대신 실제 이름인 '${userInfo.name}'님을 본문에 직접 사용하여, 예를 들어 "${userInfo.name}님의 사주는..." 과 같이 친근하게 해석해줘.

        [출력 포맷 (JSON Only)]
        {
           "title": "캐릭터를 나타내는 수식어 (예: 겨울바다 위에 뜬 외로운 태양)",
           "character_name": "캐릭터 이름",
           "description": "가장 높은 점수를 받은 핵심 기운 1~2개만 사용한 임팩트 있는 해석 (한자 최소화, 구구절절 나열 금지)",
           "chemistry": { 
               "good": "캐릭터 이름 (메인 캐릭터와 중복 금지, 위 28명 명단 안에서 고를 것) : 이유", 
               "bad": "캐릭터 이름 (메인 캐릭터와 중복 금지, 위 28명 명단 안에서 고를 것) : 이유" 
           }
        }
        `;

        const result = await model.generateContent(prompt);
        const response = await result.response;
        const text = response.text();
        console.log("Gemini Raw Response:", text); // 디버깅용 로그 추가

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
