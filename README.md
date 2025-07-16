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

## Google 로그인 문제 해결

### 1. Supabase 콘솔 설정 확인
1. **Supabase 프로젝트 대시보드** → **Authentication** → **Providers**
2. **Google** 활성화
3. **Client ID**와 **Client Secret** 설정
4. **Redirect URL** 설정: `https://your-domain.com/auth/callback`

### 2. Google Cloud Console 설정
1. **Google Cloud Console** → **APIs & Services** → **Credentials**
2. **OAuth 2.0 Client ID** 생성
3. **Authorized JavaScript origins**에 도메인 추가:
   - `http://localhost:3000` (개발용)
   - `https://your-domain.com` (배포용)
4. **Authorized redirect URIs**에 추가:
   - `https://your-domain.com/auth/callback`

### 3. 리다이렉트 오류 해결 방법

#### **3-1. 즉시 확인**
브라우저 개발자 도구 콘솔에서 실행:
```javascript
// 현재 URL 정보 확인
debugRedirectUrls();

// Supabase 설정 확인
debugSupabaseConfig();
```

#### **3-2. Supabase 콘솔 설정**
1. **Supabase 대시보드** → **Authentication** → **URL Configuration**
2. **Site URL** 설정: `https://your-domain.com`
3. **Redirect URLs**에 다음 추가:
   ```
   https://your-domain.com/index.html
   https://your-domain.com/club.html
   https://your-domain.com/club-list.html
   https://your-domain.com/club-register.html
   https://your-domain.com/list.html
   https://your-domain.com/register.html
   https://your-domain.com/profile.html
   https://your-domain.com/buyong.html
   ```

#### **3-3. Google Cloud Console 설정**
1. **Google Cloud Console** → **APIs & Services** → **Credentials**
2. **OAuth 2.0 Client ID** 선택
3. **Authorized redirect URIs**에 다음 추가:
   ```
   https://jyvgzfewhwwkygxlbvvt.supabase.co/auth/v1/callback
   ```

#### **3-4. 로컬 개발 환경**
로컬에서 테스트하는 경우:
```
http://localhost:3000/index.html
http://localhost:3000/club.html
http://localhost:3000/club-list.html
http://localhost:3000/club-register.html
http://localhost:3000/list.html
http://localhost:3000/register.html
http://localhost:3000/profile.html
http://localhost:3000/buyong.html
```

#### **3-5. GitHub Pages 배포 환경**
GitHub Pages에서 배포하는 경우:
```
https://rjsndksla.github.io/by-lost-item-web
https://rjsndksla.github.io/by-lost-item-web/index.html
https://rjsndksla.github.io/by-lost-item-web/club.html
https://rjsndksla.github.io/by-lost-item-web/club-list.html
https://rjsndksla.github.io/by-lost-item-web/club-register.html
https://rjsndksla.github.io/by-lost-item-web/list.html
https://rjsndksla.github.io/by-lost-item-web/register.html
https://rjsndksla.github.io/by-lost-item-web/profile.html
https://rjsndksla.github.io/by-lost-item-web/buyong.html
```

### 4. 디버깅 방법
브라우저 개발자 도구 콘솔에서 다음 명령어 실행:
```javascript
// 인증 상태 확인
debugAuthState();

// Supabase 설정 확인
debugSupabaseConfig();

// 리다이렉트 URL 확인
debugRedirectUrls();
```

### 5. 일반적인 문제들
- **CORS 오류**: 도메인이 Google Cloud Console에 등록되지 않음
- **리다이렉트 오류**: Supabase 콘솔의 Redirect URL 설정 오류
- **토큰 만료**: 브라우저 캐시/쿠키 삭제 후 재시도
- **redirect_uri_mismatch**: Google Cloud Console의 Authorized redirect URIs에 Supabase 콜백 URL 추가 필요

## GitHub Pages 배포 문제 해결

### 1. GitHub Pages 설정 확인
1. **GitHub 저장소** → **Settings** → **Pages**
2. **Source**가 **Deploy from a branch**로 설정되어 있는지 확인
3. **Branch**가 **main** 또는 **master**로 설정되어 있는지 확인
4. **Folder**가 **/(root)**로 설정되어 있는지 확인

### 2. 파일 경로 문제 해결
GitHub Pages에서 404 오류가 발생하는 경우:

#### **2-1. 올바른 URL 사용**
- ❌ 잘못된 URL: `https://rjsndksla.github.io/`
- ✅ 올바른 URL: `https://rjsndksla.github.io/by-lost-item-web-main/`

#### **2-2. 파일 확장자 확인**
- ❌ 잘못된 경로: `https://rjsndksla.github.io/by-lost-item-web-main/club`
- ✅ 올바른 경로: `https://rjsndksla.github.io/by-lost-item-web-main/club.html`

### 3. 디버깅 방법
브라우저 개발자 도구 콘솔에서 실행:
```javascript
// GitHub Pages 환경 진단
debugGitHubPages();

// 네트워크 문제 진단
debugNetworkIssues();

// 리다이렉트 URL 확인
debugRedirectUrls();
```

### 4. 일반적인 GitHub Pages 문제들
- **404 오류**: 파일 경로가 잘못됨 - 올바른 저장소 경로 사용
- **빈 페이지**: JavaScript 오류 - 개발자 도구에서 콘솔 확인
- **스타일 누락**: CSS 파일 경로 오류 - 상대 경로 확인
- **인증 실패**: Supabase 설정 오류 - 리다이렉트 URL 확인

## AuthSessionMissingError 해결

### 1. 문제 진단
브라우저 개발자 도구 콘솔에서 실행:
```javascript
// 세션 상태 확인
debugSession();

// 인증 상태 확인
debugAuthState();

// URL 파라미터 확인
debugUrlParams();
```

### 2. 원인 및 해결 방법

#### **2-1. 세션 누락 원인**
- **토큰 파라미터 처리 실패**: URL의 access_token이 제대로 처리되지 않음
- **세션 저장 실패**: 로컬 스토리지나 쿠키에 세션이 저장되지 않음
- **리다이렉트 오류**: GitHub Pages 환경에서 세션 전달 실패

#### **2-2. 해결 방법**
1. **브라우저 캐시/쿠키 삭제** 후 재시도
2. **개인 브라우징 모드**에서 테스트
3. **다른 브라우저**에서 테스트
4. **Supabase 콘솔**에서 세션 설정 확인

### 3. 디버깅 방법
```javascript
// 세션 상세 정보 확인
debugSession();

// 인증 상태 확인
debugAuthState();

// 네트워크 연결 확인
debugNetworkIssues();
```

### 4. 일반적인 문제들
- **AuthSessionMissingError**: 세션이 누락됨 - 토큰 파라미터 처리 확인
- **토큰 만료**: 세션이 만료됨 - 재로그인 필요
- **CORS 오류**: 도메인 설정 오류 - Supabase 콘솔 확인
- **리다이렉트 오류**: URL 설정 오류 - 리다이렉트 URL 확인

## 동아리 게시글 공개 문제 해결

### 1. 문제 진단
브라우저 개발자 도구 콘솔에서 실행:
```javascript
// 동아리 데이터베이스 상태 확인
debugClubDatabase();

// 동아리 목록 조회 테스트
loadClubList();
```

### 2. Supabase RLS 정책 설정
동아리 게시글이 모든 사용자에게 보이도록 하려면:

#### **2-1. Supabase 콘솔에서 설정**
1. **Supabase 대시보드** → **Authentication** → **Policies**
2. **clubs** 테이블 선택
3. **RLS 활성화** 확인
4. **정책 추가**:
   - **정책 이름**: `Enable read access for all users`
   - **정책 타입**: `SELECT`
   - **정책 정의**:
   ```sql
   CREATE POLICY "Enable read access for all users" ON "public"."clubs"
   FOR SELECT USING (true);
   ```

#### **2-2. 테이블 권한 설정**
1. **Supabase 대시보드** → **Table Editor** → **clubs**
2. **Settings** → **RLS**
3. **Enable RLS** 체크
4. **정책 추가**:
   ```sql
   -- 읽기 권한 (모든 사용자)
   CREATE POLICY "clubs_select_policy" ON "public"."clubs"
   FOR SELECT USING (true);
   
   -- 쓰기 권한 (인증된 사용자만)
   CREATE POLICY "clubs_insert_policy" ON "public"."clubs"
   FOR INSERT WITH CHECK (auth.uid() = user_id);
   
   -- 수정 권한 (작성자만)
   CREATE POLICY "clubs_update_policy" ON "public"."clubs"
   FOR UPDATE USING (auth.uid() = user_id);
   
   -- 삭제 권한 (작성자만)
   CREATE POLICY "clubs_delete_policy" ON "public"."clubs"
   FOR DELETE USING (auth.uid() = user_id);
   ```

### 3. Storage 권한 설정
동아리 포스터 이미지가 공개적으로 접근 가능하도록:

1. **Supabase 대시보드** → **Storage** → **club-posters**
2. **Settings** → **Public bucket** 활성화
3. **Policies**에서 읽기 권한 추가:
   ```sql
   CREATE POLICY "Public Access" ON storage.objects
   FOR SELECT USING (bucket_id = 'club-posters');
   ```

### 4. 디버깅 방법
```javascript
// 동아리 데이터베이스 상태 확인
debugClubDatabase();

// 동아리 목록 조회 테스트
loadClubList();

// 현재 사용자 정보 확인
debugAuthState();
```

### 5. 일반적인 문제들
- **RLS 정책 오류**: Supabase 콘솔에서 RLS 정책 설정 확인
- **Storage 권한 오류**: club-posters 버킷의 공개 설정 확인
- **데이터베이스 연결 오류**: Supabase URL과 API 키 확인

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