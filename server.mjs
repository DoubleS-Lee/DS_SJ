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

        console.log(`계산된 사주: ${fourPillars}`);
        console.log(`계산된 사주(한자): ${fourPillarsHanja}`);
        console.log(`오행 정보: ${ohaengInfo}`);

        const genAI = new GoogleGenerativeAI(apiKey);
        const model = genAI.getGenerativeModel({ 
                      model: "gemini-2.5-flash",
                        generationConfig: {
                            temperature: 0.05, 
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
        입력된 네 개의 기둥(년/월/일/시)을 천간과 지지로 나누고, 아래 점수를 부여하고 오행별로 더해서 가장 점수가 높은 오행(Dominant Element)을 찾아라.
        - 년주(Year): 천간 5점 / 지지 5점 (가문, 배경)
        - 월주(Month): 천간 10점 / **지지 30점** (사회적 환경, 계절, 가장 중요!)
        - 일주(Day): **천간 20점** (본원, 나 자신) / **지지 15점** (배우자궁, 현실)
        - 시주(Time): 천간 10점 / 지지 5점 (말년, 숨겨진 무기)

        **2단계: 핵심 글자(Key Character) 분석**
        사주 전체 점수와 별개로, 아래 3글자의 특성을 최우선으로 해석에 반영하라.
        1. **일간(Day Stem, 20점):** 사용자의 본질적인 성격 (예: 병화면 태양, 임수면 바다).
        2. **월지(Month Branch, 30점):** 사용자가 살아가는 무대와 환경 (예: 전장, 훈련장, 평화로운 마을).
        3. **일지(Day Branch, 15점):** 사용자의 깔고 앉은 현실적 기반.

        **3단계: 60갑자 기둥별 구조적 물상(이미지) 종합**
        각 기둥의 간지(예: 갑자, 병인 등) 자체가 가지는 '물상(자연물의 형상과 구조)'을 아래 비중으로 섞어서 캐릭터의 서사를 형상화하라.
        - **월주(40%) + 일주(35%)** = 캐릭터의 메인 성격과 서사 (75% 비중)
        - 시주(15%) + 년주(10%) = 숨겨진 반전 매력이나 배경 설정

        **4단계: 선택과 집중 (낮은 점수 버리기)**
        사주의 8글자를 모두 구구절절 설명하려 하지 마라. 위 1~3단계 계산을 통해 **가장 점수가 높은 핵심 기운(1~2개)과 가장 뚜렷한 물상만 뽑아서 해석**해라. 점수가 낮거나 비중이 적은 오행이나 특징은 과감히 버리고 절대 언급하지 마라.

        **5단계: 귀멸의 칼날 캐릭터 매칭 (다차원 종합 평가 및 중복 배제)**
        앞선 1~3단계의 결과를 종합하여, [1.가장 높은 점수의 오행]을 먼저 선별하고, [2.일간/월지의 특성] + [3. 60갑자의 구조적 물상]이 가장 완벽하게 교집합을 이루는 단 1명의 캐릭터를 아래 사전에서 도출하라. (동일한 사주에는 반드시 동일한 메인 캐릭터가 도출되어야 함)
        
        [캐릭터 매칭 다차원 사전 - 총 28명]
        아래의 그룹별 세부 조건을 반드시 적용하여 교집합을 찾을 것.

        **1. 불과 태양의 그룹 (렌고쿠 쿄쥬로, 우즈이 텐겐, 하시비라 이노스케, 아카자)**
        - [기본] 화(火) 주도
        - [세부] 
          * 렌고쿠 쿄쥬로: 병화(태양) + 넓고 환한 물상 = 만물을 비추며 압도적인 긍정과 리더십을 뿜어내는 태양.
          * 우즈이 텐겐: 정화(불꽃) + 화려하고 장식적인 60갑자 = 시선을 사로잡는 화려함과 예술성을 지닌 타오르는 불꽃.
          * 하시비라 이노스케: 일지/월지가 충(부딪힘)하여 통제 안 되는 불 = 본능과 직관에 따르는 거침없는 야생의 산불.
          * 아카자: 오직 하나의 목적(불)으로 쏠려 주변을 태우는 극단성 = 오직 무(武)의 극한만을 향해 타오르는 순수하고 광적인 용광로.

        **2. 물과 심연의 그룹 (토미오카 기유, 코쵸우 시노부, 도우마, 굣코, 루이)**
        - [기본] 수(水) 주도
        - [세부] 
          * 토미오카 기유: 임수(깊은 물) + 고립된 일지 = 겉은 잔잔하지만 속에는 깊은 슬픔과 고독을 간직한 호수.
          * 코쵸우 시노부: 계수(이슬) + 예리한 금(金)이 섞인 물상 = 웃는 얼굴 아래 차가운 분노와 치밀한 계산(독)을 숨긴 이슬.
          * 도우마: 금수쌍청(물과 쇠만 있어 꽁꽁 언 얼음) = 화려하고 유연하나 타인에 대한 공감 능력이 완전히 결여된 서늘한 얼음.
          * 굣코: 깊고 어두운 수(水) 기운의 꼬임 = 자기만의 예술성에 빠져 타인의 이해를 구하지 않는 기괴한 심연.
          * 루이: 일간이 약하고 월지에 짓눌린 형국 = 가족(유대)에 대한 슬픈 집착과 끊어지지 않는 미련을 품은 차가운 겨울비.
        
        **3. 쇠와 칼날의 그룹 (시나즈가와 사네미, 토키토 무이치로, 코쿠시보, 이구로 오바나이, 카이가쿠)**
        - [기본] 금(金) 주도
        - [세부] 
          * 시나즈가와 사네미: 경금(무쇠) + 강력한 살기 = 상처가 많고 거칠지만 한 번 결정하면 밀어붙이는 파괴적인 도끼.
          * 토키토 무이치로: 신금(예리한 메스) + 감정이 메마른 물상 = 감정을 배제한 순수한 천재성, 목적에만 집중하는 날카로움.
          * 코쿠시보: 완벽히 제련되었으나 속이 빈(공망) 금 = 오직 일인자(최고)를 향한 집착과 차가운 열등감에 사로잡힌 명검.
          * 이구로 오바나이: 쇠기운이 음습하게 꼬인(원진살) 형태 = 냉소적이고 의심이 많아 독설을 날리지만 내면의 규칙이 확고한 비수.
          * 카이가쿠: 실속만 챙기도록 깎인 금 = 대의나 의리보다 오직 개인의 생존과 강해짐을 우선시하는 차가운 금속.
        
        **4. 나무와 대지의 그룹 (카마도 탄지로, 카마도 네즈코, 우부야시키 카가야, 히메지마 교메이, 칸로지 미츠리, 한텐구)**
        - [기본] 목(木)이나 토(土) 주도
        - [세부] 
          * 카마도 탄지로: 갑목(큰 나무) + 맑은 햇살(병화) = 따뜻한 햇살을 받아 곧게 뻗어 나가며 모두를 그늘로 덮어 품어주는 거목.
          * 카마도 네즈코: 을목(넝쿨) + 차가운 겨울 월지 = 극한의 억압(혹한) 속에서도 꺾이지 않고 본질을 유지하는 끈질긴 생명력.
          * 우부야시키 카가야: 기토(만물을 품는 흙) + 튼튼한 뿌리 = 겉으로는 병약하나 수많은 생명들의 근간이 되어주는 조용하고 묵직한 대지.
          * 히메지마 교메이: 무토(거대한 산) + 흔들림 없는 일지 = 흔들림 없는 굳건한 신념과 무뚝뚝함 속에 숨겨진 깊은 자비심.
          * 칸로지 미츠리: 따뜻하고 조화로운 토(土) = 모두를 수용하는 긍정적인 사랑과 풍부한 감수성을 지닌 따스한 흙.
          * 한텐구: 겹겹이 쌓인 음습하고 깊은 동굴(토) = 겉으론 나약해 보이나 속을 알 수 없고 이기적인 자아를 여러 겹 숨기고 있는 미로.
        
        **5. 특수/극단적 충돌 그룹 (키부츠지 무잔, 아가츠마 젠이츠, 다키, 규타로, 타마요, 유시로, 나키메, 엔무)**
        - [기본] 특정 오행 0개이거나, 서로 충돌하는 오행이 섞여 있거나, 원진살/도화살 등 특수한 구조가 있는 사주
        - [세부] 
          * 키부츠지 무잔: 빛(화)이 0개이고 수/금이 지배하는 완벽히 칠흑인 사주 = 온기(자비)가 결여된 극한의 이기심과 죽음에 대한 공포.
          * 아가츠마 젠이츠: 목화(木火)와 금수(金水)가 사정없이 부딪히는 사주 = 평소엔 극도의 불안과 도피 성향을 보이나 한계치에서 벼락처럼 폭발하는 내적 갈등.
          * 다키: 화(火)와 금(金)의 날카로운 충돌 + 도화살 = 화려하게 시선을 사로잡지만, 내면이 불안정하여 타인에게 끝없이 의존해야 타오르는 위태로운 불꽃.
          * 규타로: 탁하고 차가운 진흙(토/수) + 원진살 = 세상에 대한 지독한 원망과 열등감으로 뭉쳐있으나, 오직 하나의 대상(동생)만을 지키려는 맹독성의 늪.
          * 타마요: 깊은 밤의 계수(이슬) + 편인 = 칠흑 같은 어둠 속에서 수백 년간 자신의 목적(복수와 속죄)을 위해 숨죽여 약초를 달이는 서늘한 우물.
          * 유시로: 극단적으로 편중된 종격 사주 = 오직 단 하나의 대상(타마요)에게만 모든 에너지가 쏠려 주변을 배척하고 맹목적으로 집착하는 레이저.
          * 나키메: 고립된 토(土) + 감정 표현의 부재(무식상) = 감정의 동요 없이 자신만의 폐쇄적인 공간을 통제하며 그 자리에서 움직이지 않는 거대한 벽.
          * 엔무: 안개처럼 형체가 불분명하고 허약한(신약) 사주 = 현실을 도피하고 환상과 꿈속에서 쾌락과 조종을 일삼는 안개.

        [작성 규칙]
        1. 내용 최적화: 모든 특징을 나열하지 말고, **가장 강력한 기질 딱 하나**만 집중적으로 설명해. 사주 해석을 캐릭터의 성격/행적과 연결하여 **최소 5문장**으로 길고 임팩트 있게 작성해.
        2. 표기 제한: 사주 용어는 '한글(한자)'로 표기하되, 가독성을 위해 **글 전체에서 한자 사용은 최대 1~2개**로 엄격히 제한해.
        3. 중복 금지: 'chemistry'의 good/bad에 들어가는 캐릭터는 메인 'character_name'에 나온 캐릭터와 **절대 겹쳐서는 안 되며**, 반드시 서로 다른 3명의 캐릭터가 출력되어야 해. (캐릭터는 반드시 위 사전의 28명 명단 안에서 고를 것)
        4. 말투: '~입니다', '~합니다' 체의 잘 설명해주는 말투. 반드시 '사용자'나 '사용자님'이라는 단어 대신 실제 이름인 '${userInfo.name}'님을 본문에 직접 사용하여, 예를 들어 "${userInfo.name}님의 사주는..." 과 같이 친근하게 해석해줘.

        [출력 포맷 (JSON Only)]
        {
           "title": "캐릭터를 나타내는 수식어 (예: 겨울바다 위에 뜬 외로운 태양)",
           "character_name": "캐릭터 이름 (위 28명 중 택 1)",
           "reason": "해당 캐릭터를 매칭하게 된 논리적이고 구체적인 사주적 이유 (터미널 출력용)",
           "description": "가장 높은 점수를 받은 핵심 기운 1~2개만 사용한 임팩트 있는 해석 (최소 5문장, 한자 최소화, ${userInfo.name} 포함)",
           "chemistry": { 
               "good": "캐릭터 이름 (메인 캐릭터와 중복 금지, 28명 중 택 1) : 이유", 
               "bad": "캐릭터 이름 (메인 캐릭터와 중복 금지, 28명 중 택 1) : 이유" 
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
            
            console.log(`\n============================`);
            console.log(`[캐릭터 매칭 사유]`);
            console.log(`추천 캐릭터: ${jsonData.character_name}`);
            console.log(`매칭 사유: ${jsonData.reason}`);
            console.log(`============================\n`);

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
