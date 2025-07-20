// 검색 결과 페이지 전용 JavaScript

// DOM이 로드된 후 실행
window.addEventListener('DOMContentLoaded', async function() {
    // script.js가 로드될 때까지 잠시 대기
    setTimeout(async function() {
        // 인증 상태 확인 (어드민 권한 확인을 위해)
        if (typeof checkAuthState === 'function') {
            await checkAuthState();
        }
        
        // URL에서 검색어 파라미터 가져오기
        const urlParams = new URLSearchParams(window.location.search);
        const searchTerm = urlParams.get('q');
        
        if (!searchTerm) {
            // 검색어가 없으면 홈으로 리다이렉트
            window.location.href = 'index.html';
            return;
        }
        
        // 검색어와 결과 개수 표시
        const searchTermElement = document.getElementById('searchTerm');
        if (searchTermElement) {
            searchTermElement.textContent = `"${searchTerm}" 검색 결과`;
        }
        
        try {
            // 검색 실행 (script.js의 함수 사용)
            let searchResults = [];
            
            console.log('getPostsWithRetry 함수 존재 여부:', typeof getPostsWithRetry);
            console.log('supabase 객체 존재 여부:', typeof supabase);
            
            // Supabase 직접 쿼리 시도
            if (typeof supabase !== 'undefined') {
                console.log('Supabase 직접 쿼리 시도...');
                try {
                    const { data, error } = await supabase
                        .from('posts')
                        .select('*')
                        .order('created_at', { ascending: false });
                    
                    if (error) {
                        console.error('Supabase 직접 쿼리 오류:', error);
                        throw error;
                    }
                    
                    console.log('직접 쿼리로 가져온 게시물 수:', data ? data.length : 'null');
                    
                    if (!data || data.length === 0) {
                        console.log('게시물이 없거나 권한이 없습니다.');
                        searchResults = [];
                    } else {
                        // 검색어로 필터링
                        searchResults = data.filter(post => 
                            post.title && post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            post.description && post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            post.category && post.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            post.location && post.location.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                        console.log('필터링된 검색 결과 수:', searchResults.length);
                    }
                } catch (dbError) {
                    console.error('Supabase 직접 쿼리 오류:', dbError);
                    
                    // 권한 오류인지 확인
                    if (dbError.message && dbError.message.includes('permission')) {
                        throw new Error('데이터베이스 접근 권한이 없습니다. 관리자에게 문의하세요.');
                    } else if (dbError.message && dbError.message.includes('network')) {
                        throw new Error('네트워크 연결 오류입니다. 인터넷 연결을 확인해주세요.');
                    } else {
                        throw new Error('데이터베이스 조회 중 오류가 발생했습니다: ' + dbError.message);
                    }
                }
            } else if (typeof getPostsWithRetry === 'function') {
                console.log('getPostsWithRetry 함수 호출 시작...');
                try {
                    const allPosts = await getPostsWithRetry();
                    console.log('가져온 게시물 수:', allPosts ? allPosts.length : 'null');
                    
                    if (!allPosts || allPosts.length === 0) {
                        console.log('게시물이 없거나 권한이 없습니다.');
                        searchResults = [];
                    } else {
                        // 검색어로 필터링
                        searchResults = allPosts.filter(post => 
                            post.title && post.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            post.description && post.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            post.category && post.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            post.location && post.location.toLowerCase().includes(searchTerm.toLowerCase())
                        );
                        console.log('필터링된 검색 결과 수:', searchResults.length);
                    }
                } catch (dbError) {
                    console.error('데이터베이스 조회 오류:', dbError);
                    throw new Error('데이터베이스 조회 중 오류가 발생했습니다: ' + dbError.message);
                }
            } else {
                console.error('Supabase 연결을 찾을 수 없습니다.');
                throw new Error('데이터베이스 연결을 찾을 수 없습니다.');
            }
            
            // 결과 개수 표시
            const searchCountElement = document.getElementById('searchCount');
            if (searchCountElement) {
                searchCountElement.textContent = `총 ${searchResults.length}개의 게시물을 찾았습니다`;
            }
            
            const searchResultsGrid = document.getElementById('searchResultsGrid');
            if (!searchResultsGrid) return;
            
            if (searchResults.length === 0) {
                // 검색 결과가 없을 때
                searchResultsGrid.innerHTML = `
                    <div class="search-no-results">
                        <i class="fas fa-search"></i>
                        <h3>"${searchTerm}"에 대한 검색 결과가 없습니다</h3>
                        <p style="margin-top: 10px;">다른 검색어를 시도해보세요.</p>
                    </div>
                `;
            } else {
                // 검색 결과 표시
                searchResultsGrid.innerHTML = searchResults.map(post => {
                    // 어드민 버튼 (어드민일 때만 표시)
                    const isAdmin = typeof window.isAdmin !== 'undefined' ? window.isAdmin : false;
                    const adminButtons = isAdmin ? `
                        <div class="admin-actions" style="position: absolute; top: 10px; right: 10px; display: flex; gap: 5px;">
                            <button onclick="event.stopPropagation(); if(typeof adminEditPost === 'function') adminEditPost(${post.id})" 
                                    style="background: #007bff; color: white; border: none; padding: 5px 8px; border-radius: 3px; font-size: 0.8em; cursor: pointer;">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="event.stopPropagation(); if(typeof adminDeletePost === 'function') adminDeletePost(${post.id})" 
                                    style="background: #dc3545; color: white; border: none; padding: 5px 8px; border-radius: 3px; font-size: 0.8em; cursor: pointer;">
                                <i class="fas fa-trash"></i>
                            </button>
                        </div>
                    ` : '';

                    const imageContent = post.image_url
                        ? `<img src="${post.image_url}" alt="${escapeHtml(post.title)}" loading="lazy">`
                        : `<div class="no-image">
                            <i class="fas fa-image"></i>
                            <span>이미지 없음</span>
                           </div>`;

                    const typeClass = post.type === 'lost' ? 'lost-type' : 'found-type';
                    const typeText = post.type === 'lost' ? '분실물' : '습득물';

                    return `
                        <div class="item-card" onclick="if(typeof showPostDetail === 'function') showPostDetail('${post.id}')" style="position: relative;">
                            ${adminButtons}
                            <div class="item-image">
                                ${imageContent}
                            </div>
                            <div class="item-content">
                                <div class="item-category">${escapeHtml(post.category)}</div>
                                <h3 class="item-title">${escapeHtml(post.title)} <span class="item-type ${typeClass}">${typeText}</span></h3>
                                <p class="item-description">${escapeHtml(post.description || '설명 없음')}</p>
                                <div class="item-meta">
                                    <span class="item-date">${post.type === 'lost' ? '분실' : '습득'}날짜: ${formatDate(post.date_lost)}</span>
                                    <span class="item-location">${post.type === 'lost' ? '분실' : '발견'}장소: ${escapeHtml(post.location)}</span>
                                </div>
                                <div class="item-contact">
                                    <span><i class="fas fa-phone"></i>${escapeHtml(post.contact_phone || '연락처 없음')}</span>
                                </div>
                            </div>
                        </div>
                    `;
                }).join('');
            }
            
        } catch (error) {
            console.error('검색 중 오류 발생:', error);
            console.error('오류 상세 정보:', {
                message: error.message,
                stack: error.stack,
                name: error.name
            });
            
            const searchResultsGrid = document.getElementById('searchResultsGrid');
            if (searchResultsGrid) {
                searchResultsGrid.innerHTML = `
                    <div class="search-error">
                        <i class="fas fa-exclamation-triangle"></i>
                        <h3>검색 중 오류가 발생했습니다</h3>
                        <p style="margin-top: 10px;">${error.message}</p>
                        <p style="margin-top: 5px; font-size: 0.9em; color: #666;">오류 코드: ${error.name}</p>
                    </div>
                `;
            }
        }
    }, 100); // script.js가 로드될 시간을 주기 위해 100ms 대기
});

// HTML 이스케이프 함수
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 날짜 포맷 함수
function formatDate(dateString) {
    if (!dateString) return '날짜 없음';
    try {
        const date = new Date(dateString);
        const year = date.getFullYear();
        const month = date.getMonth() + 1;
        const day = date.getDate();
        return `${year}년 ${month}월 ${day}일`;
    } catch (error) {
        return '날짜 오류';
    }
} 