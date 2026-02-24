require('dotenv').config();
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function check() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log("---------------------------------------------------");
  console.log("🔍 API 키 진단 시작");
  
  if (!apiKey || apiKey.includes('YOUR_ACTUAL') || apiKey.trim() === "") {
    console.error("❌ [오류] .env 파일에 API 키가 제대로 설정되지 않았습니다.");
    console.error("현재 키 상태: " + (apiKey ? "문구 수정 필요" : "비어있음"));
    return;
  }

  console.log("✅ API 키를 찾았습니다. (길이: " + apiKey.length + "자)");

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // 모델 리스트를 가져오는 대신, 가장 기본적인 모델로 테스트 통신을 시도합니다.
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    
    console.log("🚀 'gemini-1.5-flash' 모델로 테스트 요청 중...");
    const result = await model.generateContent("Hi");
    const response = await result.response;
    
    console.log("🎉 [성공!] 응답 수신 완료.");
    console.log("👉 결론: 현재 키는 정상입니다! 서버를 껐다 켜보세요 (npm start).");

  } catch (error) {
    console.error("---------------------------------------------------");
    console.error("💥 [진단 실패] 에러 메시지:");
    console.error(error.message);
    
    if (error.message.includes('404')) {
      console.log("\n💡 [404 에러 해결 가이드]");
      console.log("1. API 키 발급처 확인: 반드시 'Google AI Studio'에서 받아야 합니다.");
      console.log("2. 모델 이름 불일치: SDK 버전이 맞지 않거나 모델이 아직 활성화되지 않았습니다.");
      console.log("3. .env 파일 저장 여부: 키를 입력한 후 '저장(Ctrl+S)'을 하셨는지 꼭 확인하세요!");
    }
  }
  console.log("---------------------------------------------------");
}

check();