require('dotenv').config();

async function listModels() {
  const apiKey = process.env.GEMINI_API_KEY;
  
  console.log("---------------------------------------------------");
  console.log("📋 사용 가능한 모델 목록 조회 시도...");
  
  try {
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
    const data = await response.json();

    if (data.models) {
      console.log("✅ 성공! 사용할 수 있는 모델들:");
      data.models.forEach(m => {
        console.log(`- ${m.name} (${m.displayName})`);
      });
      console.log("\n💡 위 목록 중 'models/' 다음에 오는 이름을 사용해야 합니다.");
    } else {
      console.error("❌ 모델 목록을 가져올 수 없습니다.");
      console.error("응답 내용:", JSON.stringify(data));
    }
  } catch (error) {
    console.error("💥 오류 발생:", error.message);
  }
  console.log("---------------------------------------------------");
}

listModels();