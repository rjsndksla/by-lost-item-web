# 부용고 분실물 찾기 서비스

분실물 등록/조회, 이미지 업로드, 인증, 게시글 관리 등 다양한 기능을 제공하는 웹 서비스입니다.

## 주요 기능
- 분실물/습득물 게시글 등록 및 목록 조회
- 이미지 업로드 및 미리보기
- Supabase 인증(회원가입, 로그인, 이메일 인증)
- 게시글 상세 모달, 필터(분실/습득, 유형)
- 반응형 UI/UX, 모던 디자인

## 기술 스택
- **Frontend**: HTML, CSS, JavaScript
- **Backend/DB/Storage/Auth**: [Supabase](https://supabase.com/)
- **배포**: Vercel (정적 호스팅)

## 개발/실행 방법
1. 이 저장소를 클론합니다.
   ```bash
   git clone https://github.com/your-username/your-repo.git
   cd your-repo
   ```
2. Supabase 프로젝트를 생성하고, 환경설정(`supabase-config.js`)을 본인 프로젝트에 맞게 수정합니다.
3. 로컬에서 테스트:
   - VSCode Live Server, Python http.server, 또는 Vercel CLI 등으로 실행
   ```bash
   npx vercel dev
   # 또는
   python -m http.server
   ```
4. 배포(Vercel CLI):
   ```bash
   vercel --prod
   ```

## 환경설정
- `supabase-config.js`에서 Supabase URL, ANON KEY를 본인 프로젝트에 맞게 입력해야 합니다.
- 이메일 인증, Storage 공개 설정 등은 Supabase 콘솔에서 관리합니다.

## 폴더 구조
```
├── index.html
├── list.html
├── register.html
├── profile.html
├── style.css
├── script.js
├── supabase-config.js
└── ...
```

## 라이선스
MIT

---

문의/기여/이슈는 GitHub Issue 또는 PR로 남겨주세요. 