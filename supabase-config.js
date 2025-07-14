// Supabase 클라이언트 설정
const SUPABASE_URL = 'https://jyvgzfewhwwkygxlbvvt.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp5dmd6ZmV3aHd3a3lneGxidnZ0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTIzMDkxNTgsImV4cCI6MjA2Nzg4NTE1OH0.o9FWpCwTjZItgwk8IcDszh_9isXTYsntL05etoeX8SI';
const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// 이미지 업로드 함수
async function uploadImage(file, type) {
    try {
        if (!file) return null;
        
        // 파일 크기 체크 (5MB)
        if (file.size > 5 * 1024 * 1024) {
            throw new Error('파일 크기는 5MB를 초과할 수 없습니다.');
        }

        // 파일 형식 체크
        if (!file.type.startsWith('image/')) {
            throw new Error('이미지 파일만 업로드할 수 있습니다.');
        }

        // 파일명 생성 (타임스탬프 + 랜덤문자열)
        const fileExt = file.name.split('.').pop();
        const fileName = `${Date.now()}_${Math.random().toString(36).substring(2)}.${fileExt}`;
        const filePath = `${type}/${fileName}`;

        // Storage에 업로드
        const { data, error: uploadError } = await supabase.storage
            .from('item-images')
            .upload(filePath, file, {
                cacheControl: '3600',
                upsert: false
            });

        if (uploadError) throw uploadError;

        // getPublicUrl을 사용하여 공개 URL 생성 (비공개/공개 모두 대응)
        const { data: urlData, error: urlError } = supabase.storage.from('item-images').getPublicUrl(filePath);
        if (urlError) throw urlError;
        const imageUrl = urlData.publicUrl;
        if (!imageUrl) throw new Error('이미지 URL 생성 실패');
        return imageUrl;
    } catch (error) {
        console.error('이미지 업로드 오류:', error);
        throw error;
    }
}

// 인증/CRUD/채팅 등 백엔드 연동 함수만 남김
// (UI/이벤트/모달/폼 등 프론트엔드 코드는 script.js에서 관리)

// 소셜 로그인 (window에 등록)
async function signInWithGoogle() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin }
    });
    if (error) {
        alert('Google 로그인 오류: ' + error.message);
    }
}
async function signInWithKakao() {
    const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'kakao',
        options: { redirectTo: window.location.origin }
    });
    if (error) {
        alert('Kakao 로그인 오류: ' + error.message);
    }
}
window.signInWithGoogle = signInWithGoogle;
window.signInWithKakao = signInWithKakao;

// 분실물(Found/Lost) 등록 함수
async function createPost(postData) {
    try {
        // 현재 로그인한 사용자 정보 가져오기
        const { data: { user }, error: userError } = await supabase.auth.getUser();
        if (userError) throw userError;
        if (!user) throw new Error('로그인이 필요합니다.');

        // 이미지 업로드 처리
        let imageUrl = null;
        if (postData.image) {
            imageUrl = await uploadImage(postData.image, postData.type);
        }
        delete postData.image;

        // 날짜/시간 처리
        let lostDateTime = postData.date_lost;
        if (postData.time_lost) {
            lostDateTime = `${postData.date_lost}T${postData.time_lost}`;
        }

        // 데이터 준비
        const dataToInsert = {
            ...postData,
            user_id: user.id,
            date_lost: lostDateTime,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
            image_url: imageUrl
        };

        // 불필요한 필드 제거
        delete dataToInsert.time_lost;

        // 데이터 삽입
        const { data, error } = await supabase
            .from('posts')
            .insert([dataToInsert])
            .select();

        if (error) {
            console.error('분실물 등록 오류:', error);
            throw error;
        }

        return data[0];
    } catch (error) {
        console.error('분실물 등록 오류:', error);
        throw error;
    }
}
window.createPost = createPost;

// (이하 CRUD, 채팅 등 필요한 백엔드 함수만 남기고, UI/이벤트/모달 관련 함수는 모두 삭제)
// ... 

// 게시물 목록 조회 함수 (샘플 기본 구현)
async function getPosts(type = null, limit = 50) {
    let query = supabase
        .from('posts')
        .select('*')
        .order('created_at', { ascending: false });
    if (type) query = query.eq('type', type);
    if (limit) query = query.limit(limit);
    const { data, error } = await query;
    if (error) {
        alert('게시물 조회 오류: ' + error.message);
        return [];
    }
    return data;
}

// 게시물 상세 조회 함수 (샘플 기본 구현)
async function getPostById(postId) {
    const { data, error } = await supabase
        .from('posts')
        .select('*')
        .eq('id', postId)
        .single();
    if (error) {
        alert('게시물 상세 조회 오류: ' + error.message);
        return null;
    }
    return data;
}

// 게시물 삭제 함수 (샘플 기본 구현)
async function deletePost(postId) {
    const { error } = await supabase
        .from('posts')
        .delete()
        .eq('id', postId);
    if (error) {
        alert('게시물 삭제 오류: ' + error.message);
        return false;
    }
    return true;
}

// 게시물 수정 함수 (샘플 기본 구현)
async function updatePost(postId, updateData) {
    const { error } = await supabase
        .from('posts')
        .update(updateData)
        .eq('id', postId);
    if (error) {
        alert('게시물 수정 오류: ' + error.message);
        return false;
    }
    return true;
}

// HTML 이스케이프 함수
function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// 전역 등록 (파일 마지막에 위치)
window.getPosts = getPosts;
window.getPostById = getPostById;
window.deletePost = deletePost;
window.updatePost = updatePost;
window.uploadImage = uploadImage;
window.escapeHtml = escapeHtml; // escapeHtml 함수 전역 등록
// window.createPost = createPost; // 이미 위에서 등록됨 