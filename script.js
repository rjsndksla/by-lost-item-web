// UI/이벤트/모달/폼/검색 등 프론트엔드 전용 코드만 남김

// 전역 변수
let currentPage = 0;
let isLoading = false;
let hasMoreData = true;
const itemsPerPage = 6;

// DOM이 로드된 후 실행
window.addEventListener('DOMContentLoaded', async function() {
    // URL에서 인증 토큰 파라미터 정리
    cleanupAuthParams();
    
    initializeDateFields();
    initializeFormListeners();
    initializeSearch();
    initializeAuthModal();
    await checkAuthState(); // 로그인 상태 확인

    // Supabase 인증 상태 변경 리스너 추가
    supabase.auth.onAuthStateChange(async (event, session) => {
        console.log('인증 상태 변경:', event, session?.user?.email);
        
        if (event === 'SIGNED_IN') {
            console.log('로그인 성공:', session.user.email);
            await checkAuthState();
            // 로그인 성공 후 URL 정리
            cleanupAuthParams();
        } else if (event === 'SIGNED_OUT') {
            console.log('로그아웃 완료');
            await checkAuthState();
        } else if (event === 'TOKEN_REFRESHED') {
            console.log('토큰 갱신됨');
            await checkAuthState();
        }
    });

    // 회원가입 폼 이벤트 리스너
    const signupForm = document.getElementById('emailSignupForm');
    if (signupForm) {
        signupForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('signupEmail').value;
            const password = document.getElementById('signupPassword').value;
            const passwordConfirm = document.getElementById('signupPasswordConfirm').value;
            
            if (!email || !password || !passwordConfirm) {
                alert('모든 필드를 입력해주세요.');
                return;
            }
            if (password !== passwordConfirm) {
                alert('비밀번호가 일치하지 않습니다.');
                return;
            }
            if (password.length < 6) {
                alert('비밀번호는 최소 6자 이상이어야 합니다.');
                return;
            }

            // 이메일 형식 검증
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (!emailRegex.test(email)) {
                alert('올바른 이메일 형식을 입력해주세요.');
                return;
            }

            // 회원가입 버튼 비활성화 및 로딩 상태
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.textContent;
            submitButton.disabled = true;
            submitButton.textContent = '가입 중...';

            try {
                const { data, error } = await supabase.auth.signUp({
                    email: email,
                    password: password
                });

                if (error) {
                    // 이미 등록된 이메일인지 확인
                    if (error.message && (
                        error.message.toLowerCase().includes('already registered') ||
                        error.message.toLowerCase().includes('already exists') ||
                        error.message.toLowerCase().includes('already been registered') ||
                        error.message.toLowerCase().includes('user already exists') ||
                        error.message.toLowerCase().includes('email already in use')
                    )) {
                        // 이메일 상태를 unavailable로 표시
                        showEmailStatus('unavailable', '이미 등록된 이메일입니다');
                        
                        // 사용자에게 선택 옵션 제공
                        const choice = confirm('이미 등록된 이메일입니다.\n\n로그인 페이지로 이동하시겠습니까?\n(취소를 누르면 비밀번호 찾기 페이지로 이동합니다)');
                        
                        if (choice) {
                            showLoginForm();
                        } else {
                            showPasswordReset();
                        }
                        return;
                    }
                    
                    // 기타 에러 처리
                    alert('회원가입 실패: ' + error.message);
                    return;
                }

                // 회원가입 성공
                showEmailStatus('available', '회원가입이 완료되었습니다!');
                alert('회원가입이 완료되었습니다! 이메일로 인증 링크가 발송되었습니다.\n메일을 확인하고 인증을 완료해 주세요. 인증 후 로그인할 수 있습니다.');
                this.reset();
                showLoginForm();
                
            } catch (error) {
                console.error('회원가입 중 오류:', error);
                alert('회원가입 중 오류가 발생했습니다. 다시 시도해주세요.');
            } finally {
                // 버튼 상태 복원
                submitButton.disabled = false;
                submitButton.textContent = originalText;
            }
        });
    }

    // 로그인 폼 이벤트 리스너
    const loginForm = document.getElementById('emailLoginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('loginEmail').value;
            const password = document.getElementById('loginPassword').value;

            if (!email || !password) {
                alert('이메일과 비밀번호를 모두 입력해주세요.');
                return;
            }

            const { data, error } = await supabase.auth.signInWithPassword({
                email: email,
                password: password
            });

            // 인증 미완료 계정 로그인 차단 안내
            if (error && error.message && (error.message.toLowerCase().includes('email not confirmed') || error.message.toLowerCase().includes('email confirmation'))) {
                alert('이메일 인증이 완료되지 않았습니다.\n메일을 확인해 인증을 완료해 주세요.');
                return;
            }

            if (error) {
                alert('로그인 실패: ' + error.message);
                return;
            }

            alert('로그인 성공!');
            this.reset();
            closeAuthModal();
            await checkAuthState();
        });
    }

    // 비밀번호 재설정 폼 이벤트 리스너
    const resetForm = document.getElementById('resetPasswordForm');
    if (resetForm) {
        resetForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            const email = document.getElementById('resetEmail').value;

            if (!email) {
                alert('이메일을 입력해주세요.');
                return;
            }

            const { data, error } = await supabase.auth.resetPasswordForEmail(email, {
                redirectTo: window.location.origin + '/reset-password.html'
            });

            if (error) {
                alert('비밀번호 재설정 이메일 전송 실패: ' + error.message);
                return;
            }

            alert('비밀번호 재설정 이메일이 전송되었습니다. 이메일을 확인해주세요.');
            this.reset();
            showLoginForm();
        });
    }

    // 이메일 중복 확인 기능 추가
    initializeEmailValidation();
});

// 이메일 중복 확인 기능
function initializeEmailValidation() {
    const signupEmail = document.getElementById('signupEmail');
    if (signupEmail) {
        let debounceTimer;
        
        signupEmail.addEventListener('input', function() {
            clearTimeout(debounceTimer);
            const email = this.value.trim();
            
            // 이메일 형식이 올바른 경우에만 중복 확인
            const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
            if (email && emailRegex.test(email)) {
                debounceTimer = setTimeout(() => {
                    checkEmailAvailability(email);
                }, 500); // 0.5초 딜레이
            } else {
                // 이메일 형식이 올바르지 않으면 상태 초기화
                clearEmailStatus();
            }
        });
    }
}

// 이메일 사용 가능 여부 확인
async function checkEmailAvailability(email) {
    try {
        // 로딩 상태 표시
        showEmailStatus('checking', '이메일 확인 중...');
        
        // 실제 회원가입 시도 없이 에러 메시지 패턴만 확인
        // Supabase는 보안상 이메일 중복 확인을 위한 별도 API를 제공하지 않음
        // 따라서 회원가입 시에만 중복 여부를 확인할 수 있음
        
        // 대신 사용자에게 안내 메시지 표시
        setTimeout(() => {
            showEmailStatus('info', '회원가입 시 이메일 중복 여부가 확인됩니다');
        }, 1000);
        
    } catch (error) {
        console.error('이메일 중복 확인 오류:', error);
        clearEmailStatus();
    }
}

// 이메일 상태 표시
function showEmailStatus(status, message) {
    const signupEmail = document.getElementById('signupEmail');
    if (!signupEmail) return;
    
    // 기존 상태 메시지 제거
    let statusElement = signupEmail.parentNode.querySelector('.email-status');
    if (statusElement) {
        statusElement.remove();
    }
    
    // 새로운 상태 메시지 추가
    statusElement = document.createElement('div');
    statusElement.className = `email-status email-${status}`;
    statusElement.textContent = message;
    statusElement.style.cssText = `
        font-size: 12px;
        margin-top: 4px;
        padding: 4px 8px;
        border-radius: 4px;
        font-weight: 500;
    `;
    
    if (status === 'checking') {
        statusElement.style.color = '#666';
        statusElement.style.backgroundColor = '#f0f0f0';
    } else if (status === 'available') {
        statusElement.style.color = '#28a745';
        statusElement.style.backgroundColor = '#d4edda';
    } else if (status === 'unavailable') {
        statusElement.style.color = '#dc3545';
        statusElement.style.backgroundColor = '#f8d7da';
    } else if (status === 'info') {
        statusElement.style.color = '#0c5460';
        statusElement.style.backgroundColor = '#d1ecf1';
    }
    
    signupEmail.parentNode.appendChild(statusElement);
}

// 이메일 상태 초기화
function clearEmailStatus() {
    const signupEmail = document.getElementById('signupEmail');
    if (!signupEmail) return;
    
    const statusElement = signupEmail.parentNode.querySelector('.email-status');
    if (statusElement) {
        statusElement.remove();
    }
}

// 로그인 상태 확인 및 UI 업데이트
async function checkAuthState() {
    try {
        console.log('인증 상태 확인 중...');
        
        // URL 파라미터 정리
        cleanupAuthParams();
        
        const { data: { user }, error } = await supabase.auth.getUser();
        
        if (error) {
            console.error('인증 상태 확인 오류:', error);
            // 에러가 있어도 UI는 로그아웃 상태로 표시
        }
        
        const authContainer = document.getElementById('auth-container');
        const userInfo = document.getElementById('user-info');
        
        if (user) {
            console.log('로그인된 사용자:', user.email);
            // 로그인 상태
            if (authContainer) authContainer.style.display = 'none';
            if (userInfo) {
                userInfo.style.display = 'flex';
                userInfo.innerHTML = `
                    <div class="user-menu">
                        <button class="user-menu-button" onclick="toggleUserMenu(this)">
                            ${user.email}
                            <span class="menu-arrow">▼</span>
                        </button>
                        <div class="user-menu-content">
                            <a href="${window.location.pathname.includes('club') ? 'club_profile.html' : 'profile.html'}">내 프로필</a>
                            <a href="#" onclick="handleLogout()">로그아웃</a>
                        </div>
                    </div>
                `;
            }
        } else {
            console.log('로그아웃 상태');
            // 로그아웃 상태
            if (authContainer) authContainer.style.display = 'block';
            if (userInfo) userInfo.style.display = 'none';
        }
    } catch (error) {
        console.error('인증 상태 확인 중 예외 발생:', error);
        // 예외가 발생해도 UI는 로그아웃 상태로 표시
        const authContainer = document.getElementById('auth-container');
        const userInfo = document.getElementById('user-info');
        if (authContainer) authContainer.style.display = 'block';
        if (userInfo) userInfo.style.display = 'none';
    }
}

// 사용자 메뉴 토글
function toggleUserMenu(button) {
    const menu = button.nextElementSibling;
    const allMenus = document.querySelectorAll('.user-menu-content');
    
    // 다른 메뉴 닫기
    allMenus.forEach(m => {
        if (m !== menu) m.classList.remove('active');
    });

    // 현재 메뉴 토글
    menu.classList.toggle('active');

    // 문서 클릭 시 메뉴 닫기
    document.addEventListener('click', function closeMenu(e) {
        if (!button.contains(e.target) && !menu.contains(e.target)) {
            menu.classList.remove('active');
            document.removeEventListener('click', closeMenu);
        }
    });
}

// 로그아웃 처리
async function handleLogout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
        alert('로그아웃 실패: ' + error.message);
        return;
    }
    await checkAuthState();
    window.location.href = 'index.html'; // 홈페이지로 리다이렉트
}

// 날짜 필드 초기화
function initializeDateFields() {
    const foundDate = document.getElementById('foundDate');
    const lostDate = document.getElementById('lostDate');
    if (foundDate) foundDate.value = new Date().toISOString().split('T')[0];
    if (lostDate) lostDate.value = new Date().toISOString().split('T')[0];
}

// 폼 이벤트 리스너 초기화
function initializeFormListeners() {
    const foundItemForm = document.getElementById('foundItemForm');
    const lostItemForm = document.getElementById('lostItemForm');

    // 기존 이벤트 리스너 제거
    if (foundItemForm) {
        const newFoundForm = foundItemForm.cloneNode(true);
        foundItemForm.parentNode.replaceChild(newFoundForm, foundItemForm);
        
        newFoundForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // 필수 필드 검증
            const itemName = this.itemName.value;
            const category = this.category.value;
            const foundDate = this.foundDate.value;
            const foundLocation = this.foundLocation.value;
            const contactName = this.contactName.value;
            const contactPhone = this.contactPhone.value;

            if (!itemName || !category || !foundDate || !foundLocation || !contactName || !contactPhone) {
                alert('필수 항목을 모두 입력해주세요.');
                return;
            }

            // 이미지 파일 가져오기
            const imageFile = document.getElementById('itemImage').files[0];

            const post = {
                type: 'found',
                title: itemName,
                category: category,
                description: this.description.value || '',
                location: foundLocation,
                date_lost: foundDate,
                time_lost: this.foundTime.value || null,
                contact_name: contactName,
                contact_phone: contactPhone,
                image: imageFile // 이미지 파일 추가
            };

            try {
                const result = await window.createPost(post);
                if (result) {
                    alert('주운 물건이 성공적으로 등록되었습니다!');
                    this.reset();
                    document.getElementById('foundDate').value = new Date().toISOString().split('T')[0];
                    // 이미지 프리뷰 초기화
                    const previewImg = document.getElementById('previewImg');
                    const uploadPlaceholder = imagePreview.querySelector('.upload-placeholder');
                    if (previewImg && uploadPlaceholder) {
                        previewImg.style.display = 'none';
                        previewImg.src = '';
                        uploadPlaceholder.style.display = 'block';
                    }
                }
            } catch (error) {
                alert('등록 중 오류가 발생했습니다: ' + error.message);
            }
        });

        // 이미지 업로드 관련 이벤트 리스너 다시 등록
        const imageInput = document.getElementById('itemImage');
        const imagePreview = document.getElementById('imagePreview');
        const previewImg = document.getElementById('previewImg');

        if (imageInput && imagePreview) {
            imageInput.addEventListener('change', function(e) {
                handleImageSelect(this.files[0]);
            });

            imagePreview.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('dragover');
            });

            imagePreview.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
            });

            imagePreview.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                handleImageSelect(e.dataTransfer.files[0]);
            });

            imagePreview.addEventListener('click', function() {
                imageInput.click();
            });
        }
    }

    // 기존 이벤트 리스너 제거
    if (lostItemForm) {
        const newLostForm = lostItemForm.cloneNode(true);
        lostItemForm.parentNode.replaceChild(newLostForm, lostItemForm);
        
        newLostForm.addEventListener('submit', async function(e) {
            e.preventDefault();
            
            // 필수 필드 검증
            const itemName = this.lostItemName.value;
            const category = this.lostCategory.value;
            const lostDate = this.lostDate.value;
            const lostLocation = this.lostLocation.value;
            const contactName = this.lostContactName.value;
            const contactPhone = this.lostContactPhone.value;

            if (!itemName || !category || !lostDate || !lostLocation || !contactName || !contactPhone) {
                alert('필수 항목을 모두 입력해주세요.');
                return;
            }

            // 이미지 파일 가져오기
            const imageFile = document.getElementById('lostItemImage').files[0];

            const post = {
                type: 'lost',
                title: itemName,
                category: category,
                description: this.lostDescription.value || '',
                location: lostLocation,
                date_lost: lostDate,
                time_lost: this.lostTime.value || null,
                contact_name: contactName,
                contact_phone: contactPhone,
                image: imageFile // 이미지 파일 추가
            };

            try {
                const result = await window.createPost(post);
                if (result) {
                    alert('분실물 찾기 게시글이 성공적으로 등록되었습니다!');
                    this.reset();
                    document.getElementById('lostDate').value = new Date().toISOString().split('T')[0];
                    // 이미지 프리뷰 초기화
                    const previewImg = document.getElementById('lostPreviewImg');
                    const uploadPlaceholder = document.querySelector('#lostImagePreview .upload-placeholder');
                    if (previewImg && uploadPlaceholder) {
                        previewImg.style.display = 'none';
                        previewImg.src = '';
                        uploadPlaceholder.style.display = 'block';
                    }
                }
            } catch (error) {
                alert('등록 중 오류가 발생했습니다: ' + error.message);
            }
        });

        // 이미지 업로드 관련 이벤트 리스너 다시 등록
        const imageInput = document.getElementById('lostItemImage');
        const imagePreview = document.getElementById('lostImagePreview');
        const previewImg = document.getElementById('lostPreviewImg');

        if (imageInput && imagePreview) {
            imageInput.addEventListener('change', function(e) {
                handleImageSelect(this.files[0]);
            });

            imagePreview.addEventListener('dragover', function(e) {
                e.preventDefault();
                this.classList.add('dragover');
            });

            imagePreview.addEventListener('dragleave', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
            });

            imagePreview.addEventListener('drop', function(e) {
                e.preventDefault();
                this.classList.remove('dragover');
                handleImageSelect(e.dataTransfer.files[0]);
            });

            imagePreview.addEventListener('click', function() {
                imageInput.click();
            });
        }
    }
}

// 검색 기능 초기화
function initializeSearch() {
    const searchButton = document.querySelector('.search-button');
    const searchInput = document.querySelector('.search-input');
    if (searchButton) searchButton.addEventListener('click', handleSearch);
    if (searchInput) searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') handleSearch();
    });
}
function handleSearch() {
    const searchInput = document.querySelector('.search-input');
    if (!searchInput) return;
    const searchTerm = searchInput.value.trim();
    if (searchTerm) {
        alert('검색 결과를 확인하세요: ' + searchTerm);
    } else {
        alert('검색어를 입력해주세요.');
    }
}

// 인증 모달 초기화
function initializeAuthModal() {
    const loginBtn = document.getElementById('loginBtn');
    const closeBtn = document.querySelector('.close');
    if (loginBtn) loginBtn.addEventListener('click', openAuthModal);
    if (closeBtn) closeBtn.addEventListener('click', closeAuthModal);
    window.onclick = function(event) {
        const authModal = document.getElementById('authModal');
        if (event.target === authModal) closeAuthModal();
    };
}

// 인증 모달 열기/닫기/폼 전환
function openAuthModal() {
    document.getElementById('authModal').style.display = 'block';
    showLoginForm();
}
function closeAuthModal() {
    document.getElementById('authModal').style.display = 'none';
}
function showLoginForm() {
    document.getElementById('loginForm').style.display = 'block';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('passwordResetForm').style.display = 'none';
}
function showSignupForm() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'block';
    document.getElementById('passwordResetForm').style.display = 'none';
}
function showPasswordReset() {
    document.getElementById('loginForm').style.display = 'none';
    document.getElementById('signupForm').style.display = 'none';
    document.getElementById('passwordResetForm').style.display = 'block';
}

// 전역 함수 등록 (HTML에서 onclick으로 호출되는 함수만)
window.openAuthModal = openAuthModal;
window.closeAuthModal = closeAuthModal;
window.showLoginForm = showLoginForm;
window.showSignupForm = showSignupForm;
window.showPasswordReset = showPasswordReset;
window.handleLogout = handleLogout;
window.toggleUserMenu = toggleUserMenu;
// 소셜로그인 함수는 supabase-config.js에서 window에 등록됨 

// HTML 이스케이프 함수
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// 프로필 페이지 관련 함수들
async function initializeProfilePage() {
    const { data: { user }, error } = await supabase.auth.getUser();
    if (error || !user) {
        window.location.href = 'index.html';
        return;
    }

    // 사용자 이메일 표시
    document.querySelector('.user-email-display').textContent = user.email;
    
    // 사용자의 게시글 로드
    await loadUserPosts(user.id);
}

async function loadUserPosts(userId) {
    try {
        // club_profile.html: clubs 테이블, profile.html: posts 테이블
        let posts, error;
        const postsGrid = document.getElementById('userPosts') || document.getElementById('userClubPosts');
        if (!postsGrid) return;
        if (postsGrid.id === 'userClubPosts') {
            // club_profile.html: clubs 테이블
            ({ data: posts, error } = await supabase
                .from('clubs')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false }));
        } else {
            // profile.html: posts 테이블
            ({ data: posts, error } = await supabase
                .from('posts')
                .select('*')
                .eq('user_id', userId)
                .order('created_at', { ascending: false }));
        }
        if (error) throw error;
        if (!posts || posts.length === 0) {
            postsGrid.innerHTML = '<p class="no-posts">작성한 게시글이 없습니다.</p>';
            return;
        }
        postsGrid.innerHTML = posts.map(post => {
            if (postsGrid.id === 'userClubPosts') {
                // clubs 테이블 렌더링
                return `
                <div class="post-card" data-post-id="${post.id}">
                    <div class="post-header">
                        <h3>${post.club_name || ''}</h3>
                        <div class="post-actions">
                            <button class="action-button" onclick="toggleActionMenu(this)">⋮</button>
                            <div class="action-menu">
                                <button onclick="editClubPost('${post.id}')">수정</button>
                                <button class="delete-btn" onclick="deleteClubPost('${post.id}')">삭제</button>
                            </div>
                        </div>
                    </div>
                    <div class="post-content">
                        <p><strong>카테고리:</strong> ${post.club_category || ''}</p>
                        <p><strong>소개:</strong> ${post.club_desc || ''}</p>
                        <p><strong>연락처:</strong> ${post.club_contact || ''}</p>
                        ${post.poster_url ? `<img src="${post.poster_url}" alt="동아리 포스터" class="post-image">` : ''}
                    </div>
                </div>
                `;
            } else {
                // posts 테이블 렌더링
                return `
                <div class="post-card" data-post-id="${post.id}">
                    <div class="post-header">
                        <h3>${post.title || ''}</h3>
                        <div class="post-actions">
                            <button class="action-button" onclick="toggleActionMenu(this)">⋮</button>
                            <div class="action-menu">
                                <button onclick="editPost('${post.id}')">수정</button>
                                <button class="delete-btn" onclick="deletePost('${post.id}')">삭제</button>
                            </div>
                        </div>
                    </div>
                    <div class="post-content">
                        <div class="post-type-badge ${post.type === 'lost' ? 'lost' : 'found'}">
                            ${post.type === 'lost' ? '분실물' : '습득물'}
                        </div>
                        <p><strong>분류:</strong> ${post.category || ''}</p>
                        <p><strong>장소:</strong> ${post.location || ''}</p>
                        <p><strong>날짜:</strong> ${post.date_lost ? new Date(post.date_lost).toLocaleDateString() : ''}</p>
                        ${post.time_lost ? `<p><strong>시간:</strong> ${post.time_lost}</p>` : ''}
                        ${post.description ? `<p><strong>설명:</strong> ${post.description}</p>` : ''}
                        ${post.image_url ? `<img src="${post.image_url}" alt="물건 이미지" class="post-image">` : ''}
                    </div>
                </div>
                `;
            }
        }).join('');
        document.addEventListener('click', closeAllActionMenus);
    } catch (error) {
        console.error('게시글 로드 중 오류 발생:', error);
        const postsGrid = document.getElementById('userPosts') || document.getElementById('userClubPosts');
        if (postsGrid) {
            postsGrid.innerHTML = '<p class="error-message">게시글을 불러오는 중 오류가 발생했습니다.</p>';
        }
    }
}

// 액션 메뉴 토글
function toggleActionMenu(button) {
    event.stopPropagation(); // 이벤트 버블링 방지
    
    // 다른 열린 메뉴 닫기
    const allMenus = document.querySelectorAll('.action-menu');
    allMenus.forEach(menu => {
        if (menu !== button.nextElementSibling) {
            menu.classList.remove('show');
        }
    });

    // 현재 메뉴 토글
    const menu = button.nextElementSibling;
    menu.classList.toggle('show');
}

// 모든 액션 메뉴 닫기
function closeAllActionMenus(event) {
    if (!event.target.closest('.post-actions')) {
        const allMenus = document.querySelectorAll('.action-menu');
        allMenus.forEach(menu => menu.classList.remove('show'));
    }
}

// 게시글 수정
async function editPost(postId) {
    try {
        // 게시글 데이터 가져오기
        const { data: post, error } = await supabase
            .from('posts')
            .select('*')
            .eq('id', postId)
            .single();

        if (error) throw error;

        // 수정 모달 표시 로직 구현
        alert('수정 기능은 곧 구현될 예정입니다.');
        
        // 액션 메뉴 닫기
        closeAllActionMenus({ target: document.body });
    } catch (error) {
        console.error('게시글 수정 중 오류 발생:', error);
        alert('게시글 수정 중 오류가 발생했습니다.');
    }
}

// 게시글 삭제
async function deletePost(postId) {
    try {
        if (!confirm('정말로 이 게시글을 삭제하시겠습니까?')) {
            return;
        }

        const { error } = await supabase
            .from('posts')
            .delete()
            .eq('id', postId);

        if (error) throw error;

        // 성공적으로 삭제된 경우 UI 업데이트
        const postElement = document.querySelector(`[data-post-id="${postId}"]`);
        if (postElement) {
            postElement.remove();
        }

        // 모든 게시글이 삭제된 경우 메시지 표시
        const postsGrid = document.getElementById('userPosts');
        if (!postsGrid.children.length) {
            postsGrid.innerHTML = '<p class="no-posts">작성한 게시글이 없습니다.</p>';
        }

        alert('게시글이 삭제되었습니다.');
    } catch (error) {
        console.error('게시글 삭제 중 오류 발생:', error);
        alert('게시글 삭제 중 오류가 발생했습니다.');
    }
}

// 전역 함수로 등록
window.toggleActionMenu = toggleActionMenu;
window.editPost = editPost;
window.deletePost = deletePost;

// 페이지별 초기화
if (window.location.pathname.endsWith('profile.html')) {
    window.addEventListener('DOMContentLoaded', initializeProfilePage);
} else if (
    window.location.pathname.endsWith('club.html') ||
    window.location.pathname.endsWith('club-list.html') ||
    window.location.pathname.endsWith('club-register.html')
) {
    window.addEventListener('DOMContentLoaded', function() {
        initializeAuthModal();
        checkAuthState();
    });
} 

// 이미지 업로드 관련 함수
async function handleImageUpload(files) {
    if (!files || files.length === 0) return;

    const maxFileSize = 5 * 1024 * 1024; // 5MB
    const imagePreviews = document.getElementById('imagePreviews');
    const addImageButton = imagePreviews.querySelector('.add-image');

    // 기존의 "사진 추가" 버튼을 일시적으로 제거
    if (addImageButton) {
        addImageButton.remove();
    }

    // Promise 배열을 생성하여 모든 파일을 동시에 처리
    const readPromises = Array.from(files).map(file => {
        return new Promise((resolve, reject) => {
            // 파일 크기 체크
            if (file.size > maxFileSize) {
                alert(`파일 ${file.name}의 크기가 5MB를 초과합니다.`);
                resolve(null);
                return;
            }

            // 파일 형식 체크
            if (!file.type.startsWith('image/')) {
                alert(`파일 ${file.name}은 이미지 파일이 아닙니다.`);
                resolve(null);
                return;
            }

            const reader = new FileReader();
            reader.onload = function(e) {
                const newPreviewItem = document.createElement('div');
                newPreviewItem.classList.add('image-preview-item');
                newPreviewItem.innerHTML = `
                    <img src="${e.target.result}" alt="Preview" class="preview-img">
                    <span class="file-name">${file.name}</span>
                    <button type="button" class="remove-image-btn" onclick="removeImage(this)">
                        <i class="fas fa-times"></i>
                    </button>
                `;
                resolve(newPreviewItem);
            };
            reader.onerror = () => reject(new Error(`파일 ${file.name} 읽기 실패`));
            reader.readAsDataURL(file);
        });
    });

    try {
        // 모든 파일을 동시에 처리하고 결과를 기다림
        const previewItems = await Promise.all(readPromises);
        
        // 성공적으로 생성된 프리뷰 아이템만 추가
        previewItems
            .filter(item => item !== null)
            .forEach(item => imagePreviews.appendChild(item));

        // 모든 이미지가 추가된 후 "사진 추가" 버튼을 다시 추가
        const newAddButton = document.createElement('div');
        newAddButton.classList.add('image-preview-item', 'add-image');
        newAddButton.innerHTML = `
            <i class="fas fa-plus"></i>
            <span>사진 추가</span>
        `;
        imagePreviews.appendChild(newAddButton);
    } catch (error) {
        console.error('이미지 업로드 중 오류 발생:', error);
        alert('이미지 업로드 중 오류가 발생했습니다.');
        
        // 오류 발생 시에도 "사진 추가" 버튼은 다시 추가
        const newAddButton = document.createElement('div');
        newAddButton.classList.add('image-preview-item', 'add-image');
        newAddButton.innerHTML = `
            <i class="fas fa-plus"></i>
            <span>사진 추가</span>
        `;
        imagePreviews.appendChild(newAddButton);
    }
}

// 이미지 제거 함수
function removeImage(button) {
    button.closest('.image-preview-item').remove();
}

// 폼 제출 시 이미지 처리
async function handleFormSubmit(e) {
    e.preventDefault();
    try {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) {
            alert('로그인이 필요합니다.');
            openAuthModal();
            return;
        }

        const submitButton = this.querySelector('button[type="submit"]');
        const originalText = submitButton.textContent;
        submitButton.disabled = true;
        submitButton.textContent = '등록 중...';

        const formData = new FormData(this);
        let type = formData.get('postType');
        if (!type) type = 'found'; // 기본값 보장
        // 타입에 따라 필드명 분기
        const location = type === 'lost' ? formData.get('lostLocation') : formData.get('foundLocation');
        const date_lost = type === 'lost' ? formData.get('lostDate') : formData.get('foundDate');
        const time_lost = type === 'lost' ? formData.get('lostTime') : formData.get('foundTime');
        const imageFile = formData.get('itemImage'); // 대표 이미지 1장만

        const postData = {
            type,
            title: formData.get('itemName'),
            category: formData.get('category'),
            description: formData.get('description') || '',
            location,
            date_lost,
            time_lost: time_lost || null,
            contact_name: formData.get('contactName'),
            contact_phone: formData.get('contactPhone'),
            status: 'active',
            image: imageFile // 대표 이미지 1장만
        };

        // 필수 필드 검증
        const requiredFields = ['title', 'category', 'location', 'date_lost', 'contact_name', 'contact_phone'];
        const missingFields = requiredFields.filter(field => !postData[field]);
        if (missingFields.length > 0) {
            alert('필수 항목을 모두 입력해주세요.');
            submitButton.disabled = false;
            submitButton.textContent = originalText;
            return;
        }

        const result = await createPost(postData);
        if (result) {
            alert('게시물이 성공적으로 등록되었습니다!');
            this.reset();
            document.getElementById(type === 'lost' ? 'lostDate' : 'foundDate').value = new Date().toISOString().split('T')[0];
            // 이미지 미리보기 초기화
            const imagePreviews = document.getElementById('imagePreviews');
            if (imagePreviews) {
                imagePreviews.innerHTML = `
                    <div class="image-preview-item add-image">
                        <i class="fas fa-plus"></i>
                        <span>사진 추가</span>
                    </div>
                `;
            }
        }
    } catch (error) {
        console.error('폼 제출 오류:', error);
        alert('오류가 발생했습니다: ' + error.message);
    } finally {
        const submitButton = this.querySelector('button[type="submit"]');
        submitButton.disabled = false;
        submitButton.textContent = document.querySelector('input[name="postType"]:checked').value === 'lost' 
            ? '분실물 찾기 게시하기' 
            : '주운 물건 등록하기';
    }
}

// DOM이 로드된 후 실행
window.addEventListener('DOMContentLoaded', function() {
    initializeDateFields();
    initializeFormListeners();
    initializeSearch();
    initializeAuthModal();
    checkAuthState(); // 로그인 상태 확인

    // 이미지 업로드 관련 이벤트 리스너 - register.html 페이지에서만 실행
    const imageInput = document.getElementById('itemImage');
    const imagePreviews = document.getElementById('imagePreviews');

    // register.html 페이지에서만 이미지 업로드 관련 코드 실행
    if (imageInput && imagePreviews) {
        // 파일 입력 이벤트
        imageInput.addEventListener('change', function(e) {
            handleImageUpload(this.files);
        });

        // 드래그 앤 드롭 이벤트
        imagePreviews.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('dragover');
        });

        imagePreviews.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
        });

        imagePreviews.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('dragover');
            handleImageUpload(e.dataTransfer.files);
        });

        // 이미지 추가 버튼 클릭 이벤트를 imagePreviews에 위임
        imagePreviews.addEventListener('click', function(e) {
            const clickedElement = e.target.closest('.add-image');
            if (clickedElement) {
                e.stopPropagation(); // 이벤트 버블링 중지
                imageInput.click();
            }
        });

        // 폼 제출 이벤트
        const itemForm = document.getElementById('itemForm');
        if (itemForm) {
            itemForm.addEventListener('submit', handleFormSubmit);
        }
    }
}); 

// 날짜 포맷팅 함수
function formatDate(dateString) {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return new Intl.DateTimeFormat('ko-KR', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    }).format(date);
}

// 게시물 목록 표시 (필터 적용, 개선된 에러 처리)
async function loadPosts() {
    try {
        const typeFilter = document.getElementById('typeFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const typeValue = typeFilter ? typeFilter.value : 'all';
        const categoryValue = categoryFilter ? categoryFilter.value : 'all';

        // 네트워크 상태 확인
        const networkError = checkNetworkStatus();
        if (networkError) {
            throw new Error(networkError);
        }

        let posts = await getPostsWithRetry();
        // 1차: 타입 필터
        if (typeValue !== 'all') {
            posts = posts.filter(post => post.type === typeValue);
        }
        // 2차: 카테고리 필터
        if (categoryValue !== 'all') {
            posts = posts.filter(post => post.category === categoryValue);
        }

        const itemsGrid = document.querySelector('.items-grid');
        if (!itemsGrid) return; // 요소가 없으면 함수 종료
        if (!posts || posts.length === 0) {
            itemsGrid.innerHTML = `
                <div style="text-align: center; color: #666; grid-column: 1 / -1; padding: 40px;">
                    <i class="fas fa-search" style="font-size: 36px; color: #ddd; margin-bottom: 15px;"></i>
                    <h3 style="margin-bottom: 10px; color: #333;">등록된 게시물이 없습니다</h3>
                    <p style="color: #666;">필터 조건에 맞는 게시물이 없습니다.</p>
                </div>
            `;
            return;
        }

        itemsGrid.innerHTML = posts.map(post => {
            const imageContent = post.image_url
                ? `<img src="${post.image_url}" alt="${escapeHtml(post.title)}"
                        onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML=\`<div class='no-image'>${getCategoryIcon(post.category)}</div>\`;">`
                : `<div class="no-image">${getCategoryIcon(post.category)}</div>`;

            // 타입별 클래스
            const typeClass = post.type === 'lost' ? 'lost-type' : 'found-type';
            const typeText = post.type === 'lost' ? '분실물' : '습득물';

            return `
                <div class="item-card" data-post-id="${post.id}">
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

        // 이미지 로드 완료 후 카드 클릭 이벤트 추가
        const cards = document.querySelectorAll('.item-card');
        cards.forEach(card => {
            card.addEventListener('click', function() {
                const postId = this.getAttribute('data-post-id');
                if (postId) {
                    showPostDetail(postId);
                }
            });
        });

    } catch (error) {
        console.error('게시물 로드 중 오류:', error);
        
        // 상세한 오류 정보 로깅
        const errorInfo = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            error: error.message,
            stack: error.stack
        };
        console.error('상세 오류 정보:', errorInfo);
        
        const itemsGrid = document.querySelector('.items-grid');
        if (itemsGrid) {
            let errorMessage = '게시물을 불러오는 중 오류가 발생했습니다.';
            let errorIcon = 'fas fa-exclamation-triangle';
            let errorColor = '#ffc107';
            
            if (error.message.includes('네트워크')) {
                errorMessage = '네트워크 연결을 확인해주세요.';
                errorIcon = 'fas fa-wifi';
                errorColor = '#dc3545';
            } else if (error.message.includes('오프라인')) {
                errorMessage = '오프라인 상태입니다. 인터넷 연결을 확인해주세요.';
                errorIcon = 'fas fa-wifi-slash';
                errorColor = '#dc3545';
            } else if (error.message.includes('데이터베이스')) {
                errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                errorIcon = 'fas fa-server';
                errorColor = '#fd7e14';
            }
            
            itemsGrid.innerHTML = `
                <div style="text-align: center; color: #666; grid-column: 1 / -1; padding: 40px;">
                    <i class="${errorIcon}" style="font-size: 36px; color: ${errorColor}; margin-bottom: 15px;"></i>
                    <h3 style="margin-bottom: 10px; color: #333;">${errorMessage}</h3>
                    <p style="margin-bottom: 20px; color: #666;">잠시 후 다시 시도해주세요.</p>
                    <button onclick="loadPosts()" class="submit-button" style="background: ${errorColor};">
                        <i class="fas fa-redo"></i> 다시 시도
                    </button>
                </div>
            `;
        }
    }
}

// 카테고리별 아이콘 반환
function getCategoryIcon(category) {
    const icons = {
        '전자기기': '휴대폰',
        '지갑/카드': '지갑',
        '의류/신발': '의류',
        '가방/백팩': '가방',
        '서적/문구': '책',
        '악세서리': '악세서리',
        '기타': '기타'
    };
    return icons[category] || '기타';
}

// 게시물 상세보기 (개선된 에러 처리)
async function showPostDetail(postId) {
    try {
        // 네트워크 상태 확인
        const networkError = checkNetworkStatus();
        if (networkError) {
            throw new Error(networkError);
        }

        const post = await getPostByIdWithRetry(postId);
        if (!post) {
            alert('게시물을 찾을 수 없습니다.');
            return;
        }

        const detailHtml = `
            <div class="post-detail">
                <h2>${escapeHtml(post.title)}</h2>
                ${post.image_url ? 
                    `<div class="post-image">
                        <img src="${post.image_url}" alt="${escapeHtml(post.title)}"
                             onerror="this.style.display='none';">
                    </div>` : 
                    ''
                }
                <div class="post-info">
                    <p><strong>분류:</strong> ${escapeHtml(post.category)}</p>
                    <p><strong>${post.type === 'lost' ? '분실' : '습득'}날짜:</strong> ${formatDate(post.date_lost)}</p>
                    <p><strong>${post.type === 'lost' ? '분실' : '발견'}장소:</strong> ${escapeHtml(post.location)}</p>
                    <p><strong>설명:</strong> ${escapeHtml(post.description || '설명 없음')}</p>
                    <div class="contact-info">
                        <p><strong>연락처:</strong> ${escapeHtml(post.contact_phone || '연락처 없음')}</p>
                        ${post.instagram_id ? `<p><strong>인스타그램:</strong> ${escapeHtml(post.instagram_id)}</p>` : ''}
                        <p><strong>등록일:</strong> ${formatDate(post.created_at)}</p>
                        <p><strong>상태:</strong> <span class="status-badge ${post.type}">${post.type === 'lost' ? '분실' : '습득'}</span></p>
                    </div>
                </div>
            </div>
        `;

        showModal(detailHtml);
    } catch (error) {
        console.error('게시물 상세 정보 로드 중 오류:', error);
        
        // 상세한 오류 정보 로깅
        const errorInfo = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            postId: postId,
            error: error.message,
            stack: error.stack
        };
        console.error('상세 오류 정보:', errorInfo);
        
        let errorMessage = '게시물을 불러오는 중 오류가 발생했습니다.';
        
        if (error.message.includes('네트워크')) {
            errorMessage = '네트워크 연결을 확인해주세요.';
        } else if (error.message.includes('오프라인')) {
            errorMessage = '오프라인 상태입니다. 인터넷 연결을 확인해주세요.';
        } else if (error.message.includes('데이터베이스')) {
            errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
        }
        
        alert(errorMessage);
    }
}

// 모달 표시
function showModal(content) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.style.display = 'block';
    modal.innerHTML = `
        <div class="modal-content">
            <span class="close" onclick="this.parentElement.parentElement.remove()">&times;</span>
            ${content}
        </div>
    `;
    document.body.appendChild(modal);
}

// 페이지별 초기화
if (window.location.pathname.endsWith('profile.html')) {
    window.addEventListener('DOMContentLoaded', initializeProfilePage);
} else if (window.location.pathname.endsWith('list.html')) {
    window.addEventListener('DOMContentLoaded', function() {
        loadPosts();
        initializeAuthModal();
        checkAuthState();
    });
} else if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
    window.addEventListener('DOMContentLoaded', function() {
        loadHomePagePosts();
        initializeAuthModal();
        checkAuthState();
    });
} else if (
    window.location.pathname.endsWith('club.html') ||
    window.location.pathname.endsWith('club-list.html') ||
    window.location.pathname.endsWith('club-register.html')
) {
    window.addEventListener('DOMContentLoaded', function() {
        initializeAuthModal();
        checkAuthState();
    });
} 

// 홈페이지 최신 게시물 로드 (개선된 에러 처리)
async function loadHomePagePosts() {
    try {
        const homeItemsGrid = document.getElementById('homeItemsGrid');
        if (!homeItemsGrid) return;

        // 네트워크 상태 확인
        const networkError = checkNetworkStatus();
        if (networkError) {
            throw new Error(networkError);
        }

        // 최신 게시물 3개만 가져오기 (재시도 메커니즘 포함)
        const posts = await getPostsWithRetry(null, 3);
        
        if (!posts || posts.length === 0) {
            homeItemsGrid.innerHTML = `
                <div style="text-align: center; color: #666; grid-column: 1 / -1; padding: 60px 20px;">
                    <i class="fas fa-search" style="font-size: 48px; color: #ddd; margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px; color: #333;">아직 등록된 게시물이 없습니다</h3>
                    <p style="margin-bottom: 30px; color: #666;">첫 번째 분실물/습득물을 등록해보세요!</p>
                    <button onclick="location.href='register.html'" class="submit-button" style="margin-top: 20px; background: #2c3e50;">
                        <i class="fas fa-plus"></i> 게시물 등록하기
                    </button>
                </div>
            `;
            return;
        }

        homeItemsGrid.innerHTML = posts.map(post => {
            const imageContent = post.image_url
                ? `<img src="${post.image_url}" alt="${escapeHtml(post.title)}"
                        onerror="this.onerror=null; this.style.display='none'; this.parentElement.innerHTML=\`<div class='no-image'>${getCategoryIcon(post.category)}</div>\`;">`
                : `<div class="no-image">${getCategoryIcon(post.category)}</div>`;

            // 타입별 클래스
            const typeClass = post.type === 'lost' ? 'lost-type' : 'found-type';
            const typeText = post.type === 'lost' ? '분실물' : '습득물';

            return `
                <div class="item-card" data-post-id="${post.id}" onclick="showPostDetail('${post.id}')">
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

    } catch (error) {
        console.error('홈페이지 게시물 로드 중 오류:', error);
        
        // 상세한 오류 정보 로깅
        const errorInfo = {
            timestamp: new Date().toISOString(),
            userAgent: navigator.userAgent,
            url: window.location.href,
            error: error.message,
            stack: error.stack
        };
        console.error('상세 오류 정보:', errorInfo);
        
        const homeItemsGrid = document.getElementById('homeItemsGrid');
        if (homeItemsGrid) {
            let errorMessage = '게시물을 불러오는 중 오류가 발생했습니다.';
            let errorIcon = 'fas fa-exclamation-triangle';
            let errorColor = '#ffc107';
            
            if (error.message.includes('네트워크')) {
                errorMessage = '네트워크 연결을 확인해주세요.';
                errorIcon = 'fas fa-wifi';
                errorColor = '#dc3545';
            } else if (error.message.includes('오프라인')) {
                errorMessage = '오프라인 상태입니다. 인터넷 연결을 확인해주세요.';
                errorIcon = 'fas fa-wifi-slash';
                errorColor = '#dc3545';
            } else if (error.message.includes('데이터베이스')) {
                errorMessage = '서버 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
                errorIcon = 'fas fa-server';
                errorColor = '#fd7e14';
            }
            
            homeItemsGrid.innerHTML = `
                <div style="text-align: center; color: #666; grid-column: 1 / -1; padding: 60px 20px;">
                    <i class="${errorIcon}" style="font-size: 48px; color: ${errorColor}; margin-bottom: 20px;"></i>
                    <h3 style="margin-bottom: 10px; color: #333;">${errorMessage}</h3>
                    <p style="margin-bottom: 30px; color: #666;">잠시 후 다시 시도해주세요.</p>
                    <button onclick="loadHomePagePosts()" class="submit-button" style="background: ${errorColor};">
                        <i class="fas fa-redo"></i> 다시 시도
                    </button>
                </div>
            `;
        }
    }
}

// 네트워크 상태 모니터링
window.addEventListener('online', function() {
    console.log('네트워크 연결이 복구되었습니다.');
    // 페이지가 list.html인 경우 자동으로 게시물 다시 로드
    if (window.location.pathname.endsWith('list.html')) {
        loadPosts();
    }
    // 페이지가 index.html인 경우 홈페이지 게시물 다시 로드
    if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
        loadHomePagePosts();
    }
});

window.addEventListener('offline', function() {
    console.log('네트워크 연결이 끊어졌습니다.');
});

// 드롭다운 필터 이벤트 리스너 등록
window.addEventListener('DOMContentLoaded', function() {
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    if (typeFilter) typeFilter.addEventListener('change', loadPosts);
    if (categoryFilter) categoryFilter.addEventListener('change', loadPosts);
}); 

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('clubRegisterForm');
  if (!form) return;

  // 메시지 div가 없으면 생성
  let messageDiv = document.getElementById('register-message');
  if (!messageDiv) {
    messageDiv = document.createElement('div');
    messageDiv.id = 'register-message';
    form.parentNode.insertBefore(messageDiv, form.nextSibling);
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    messageDiv.textContent = '등록 중...';
    messageDiv.style.color = '#666';

    try {
      // 입력값 가져오기 (name 속성 기준)
      const club_name = form.elements['club-name'].value.trim();
      const club_category = form.elements['club-category'].value.trim();
      const club_desc = form.elements['club-desc'].value.trim();
      const club_contact = form.elements['club-contact'].value.trim();
      const posterFile = document.getElementById('clubPosterInput').files[0];

      // 입력값 검증
      if (!club_name || !club_category || !club_desc || !club_contact) {
        messageDiv.textContent = '모든 필수 항목을 입력해주세요.';
        messageDiv.style.color = '#e74c3c';
        return;
      }

      // 로그인된 유저 정보
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) {
        console.error('사용자 정보 조회 오류:', userError);
        messageDiv.textContent = '사용자 정보를 가져오지 못했습니다.';
        messageDiv.style.color = '#e74c3c';
        return;
      }
      
      if (!user) {
        messageDiv.textContent = '로그인 후 이용해주세요.';
        messageDiv.style.color = '#e74c3c';
        return;
      }

      console.log('동아리 등록 시작:', { club_name, club_category, user_id: user.id });

      // 포스터 업로드
      let poster_url = null;
      if (posterFile) {
        console.log('포스터 업로드 시작');
        const fileExt = posterFile.name.split('.').pop();
        const fileName = `${user.id}_${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;
        
        const { error: uploadError } = await supabase.storage
          .from('club-posters')
          .upload(filePath, posterFile, { cacheControl: '3600', upsert: false });
        
        if (uploadError) {
          console.error('포스터 업로드 오류:', uploadError);
          messageDiv.textContent = '포스터 업로드 실패: ' + uploadError.message;
          messageDiv.style.color = '#e74c3c';
          return;
        }
        
        const { data: publicUrlData } = supabase
          .storage
          .from('club-posters')
          .getPublicUrl(filePath);
        poster_url = publicUrlData.publicUrl;
        console.log('포스터 업로드 완료:', poster_url);
      }

      // clubs 테이블에 데이터 삽입
      const clubData = {
        user_id: user.id,
        club_name,
        club_category,
        club_desc,
        club_contact,
        poster_url,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      console.log('동아리 데이터 삽입:', clubData);

      const { data: insertData, error: insertError } = await supabase
        .from('clubs')
        .insert([clubData])
        .select();

      if (insertError) {
        console.error('동아리 등록 오류:', insertError);
        messageDiv.textContent = '등록 실패: ' + insertError.message;
        messageDiv.style.color = '#e74c3c';
        return;
      }

      console.log('동아리 등록 성공:', insertData);
      messageDiv.textContent = '동아리 등록 완료!';
      messageDiv.style.color = '#27ae60';
      form.reset();
      document.getElementById('posterPreview').innerHTML = '';

      // 등록 완료 후 목록 새로고침 (club-list.html 페이지인 경우)
      if (document.getElementById('club-list')) {
        setTimeout(() => {
          loadClubList();
        }, 1000);
      }

    } catch (error) {
      console.error('동아리 등록 중 예외 발생:', error);
      messageDiv.textContent = '등록 중 오류가 발생했습니다: ' + error.message;
      messageDiv.style.color = '#e74c3c';
    }
  });
}); 

// 동아리 목록 로드 및 렌더링 (club-list.html)
document.addEventListener('DOMContentLoaded', () => {
  if (document.getElementById('club-list')) {
    loadClubList();
    // 카테고리 필터 버튼 이벤트
    document.querySelectorAll('.club-category-btn').forEach(btn => {
      btn.addEventListener('click', function() {
        document.querySelectorAll('.club-category-btn').forEach(b => b.classList.remove('active'));
        this.classList.add('active');
        loadClubList(this.dataset.category);
      });
    });
  }
});

async function loadClubList(category = 'all') {
  const listDiv = document.getElementById('club-list');
  if (!listDiv) return;
  
  listDiv.innerHTML = '<div style="text-align:center; padding:40px; color:#888;">불러오는 중...</div>';
  
  try {
    console.log('동아리 목록 조회 시작, 카테고리:', category);
    
    let query = supabase
      .from('clubs')
      .select('*')
      .order('created_at', { ascending: false });
      
    if (category && category !== 'all') {
      query = query.eq('club_category', category);
    }
    
    console.log('쿼리 실행 중...');
    const { data, error } = await query;
    
    if (error) {
      console.error('동아리 목록 조회 오류:', error);
      listDiv.innerHTML = `
        <div style="color:red; text-align:center; padding:20px;">
          동아리 목록을 불러오지 못했습니다.<br>
          오류: ${error.message}<br>
          <button onclick="loadClubList('${category}')" style="margin-top:10px; padding:8px 16px; background:#23408e; color:white; border:none; border-radius:4px; cursor:pointer;">
            다시 시도
          </button>
        </div>
      `;
      return;
    }
    
    console.log('조회된 동아리 수:', data?.length || 0);
    
    if (!data || data.length === 0) {
      listDiv.innerHTML = `
        <div style="text-align:center; color:#888; padding:40px;">
          등록된 동아리가 없습니다.<br>
          <a href="club-register.html" style="color:#23408e; text-decoration:none; font-weight:500;">
            첫 번째 동아리를 등록해보세요!
          </a>
        </div>
      `;
      return;
    }
    
    // 데이터 렌더링
    listDiv.innerHTML = data.map(club => `
      <div class="item-card item-card-flex" data-club-id="${club.id}">
        <div class="item-image item-image-left">
          ${club.poster_url ? 
            `<img src="${club.poster_url}" alt="포스터" style="width:160px;height:200px;object-fit:contain;background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(44,62,80,0.08);">` : 
            '<div class="no-image" style="width:160px;height:200px;background:#f8f9fa;border-radius:12px;display:flex;align-items:center;justify-content:center;color:#888;font-size:0.9em;">No Image</div>'
          }
        </div>
        <div class="item-content item-content-right">
          <div class="item-title">${escapeHtml(club.club_name || '')}</div>
          <div class="item-description">${escapeHtml(club.club_desc || '')}</div>
          <div class="item-meta" style="display:flex;justify-content:space-between;align-items:center;margin-top:10px;">
            <span class="item-location" style="color:#23408e;font-weight:500;">${escapeHtml(club.club_contact || '')}</span>
            <span class="item-category" style="background:#e3eafc;color:#23408e;padding:4px 10px;border-radius:6px;font-size:0.95em;">${escapeHtml(club.club_category || '')}</span>
          </div>
          <div style="font-size:0.8em; color:#888; margin-top:8px;">
            등록일: ${formatDate(club.created_at)}
          </div>
        </div>
      </div>
    `).join('');
    
    console.log('동아리 목록 렌더링 완료');
    
  } catch (error) {
    console.error('동아리 목록 조회 중 예외 발생:', error);
    listDiv.innerHTML = `
      <div style="color:red; text-align:center; padding:20px;">
        동아리 목록을 불러오는 중 오류가 발생했습니다.<br>
        오류: ${error.message}<br>
        <button onclick="loadClubList('${category}')" style="margin-top:10px; padding:8px 16px; background:#23408e; color:white; border:none; border-radius:4px; cursor:pointer;">
          다시 시도
        </button>
      </div>
    `;
  }
}

// 커스텀 삭제 확인 모달 생성 함수
function showDeleteConfirmModal(onConfirm) {
  // 기존 모달이 있으면 제거
  const existing = document.getElementById('deleteConfirmModal');
  if (existing) existing.remove();
  const modal = document.createElement('div');
  modal.id = 'deleteConfirmModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.25)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
    <div style="background:#fff;padding:32px 36px;border-radius:14px;box-shadow:0 4px 24px rgba(44,62,80,0.13);min-width:320px;text-align:center;">
      <div style="font-size:1.15em;font-weight:600;margin-bottom:24px;">게시글을 삭제하시겠습니까?</div>
      <div style="display:flex;gap:18px;justify-content:center;">
        <button id="deleteConfirmBtn" style="background:#e74c3c;color:#fff;padding:10px 24px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">삭제</button>
        <button id="deleteCancelBtn" style="background:#e3eafc;color:#23408e;padding:10px 24px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">취소</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('deleteConfirmBtn').onclick = () => {
    modal.remove();
    onConfirm();
  };
  document.getElementById('deleteCancelBtn').onclick = () => {
    modal.remove();
  };
}

// 성공 토스트 팝업 함수
function showSuccessToast(message) {
  // 기존 토스트가 있으면 제거
  const existing = document.getElementById('successToast');
  if (existing) existing.remove();
  const toast = document.createElement('div');
  toast.id = 'successToast';
  toast.style.position = 'fixed';
  toast.style.top = '50px';
  toast.style.left = '50%';
  toast.style.transform = 'translateX(-50%)';
  toast.style.background = 'rgba(80, 220, 120, 0.92)'; // 연두색 계열 반투명
  toast.style.color = '#fff';
  toast.style.padding = '16px 32px';
  toast.style.borderRadius = '8px';
  toast.style.fontWeight = '600';
  toast.style.fontSize = '1.1em';
  toast.style.boxShadow = '0 4px 16px rgba(44,62,80,0.13)';
  toast.style.zIndex = '10000';
  toast.textContent = message;
  document.body.appendChild(toast);
  setTimeout(() => { toast.remove(); }, 1500);
}

// club_profile.html: 동아리 게시글 삭제 (커스텀 모달 적용)
window.deleteClubPost = async function(postId) {
  showDeleteConfirmModal(async () => {
    const { error } = await supabase.from('clubs').delete().eq('id', postId);
    if (error) {
      alert('삭제 실패: ' + error.message);
      return;
    }
    // 삭제 후 해당 카드 제거
    const card = document.querySelector(`[data-post-id="${postId}"]`);
    if (card) card.remove();
    // 게시글이 모두 삭제된 경우 메시지 표시
    const postsGrid = document.getElementById('userClubPosts');
    if (postsGrid && postsGrid.children.length === 0) {
      postsGrid.innerHTML = '<p class="no-posts">등록한 동아리 게시글이 없습니다.</p>';
    }
    showSuccessToast('성공적으로 삭제되었습니다!');
  });
};

// club_profile.html: 동아리 게시글 수정 (커스텀 모달)
window.editClubPost = async function(postId) {
  // 기존 데이터 불러오기
  const { data: post, error } = await supabase.from('clubs').select('*').eq('id', postId).single();
  if (error || !post) {
    showSuccessToast('게시글 정보를 불러오지 못했습니다.');
    return;
  }
  // 기존 모달이 있으면 제거
  const existing = document.getElementById('editClubModal');
  if (existing) existing.remove();
  // 카테고리 옵션
  const categories = [
    { value: 'nature', label: '자연' },
    { value: 'humanities', label: '인문' },
    { value: 'art', label: '예체능' }
  ];
  // 모달 생성
  const modal = document.createElement('div');
  modal.id = 'editClubModal';
  modal.style.position = 'fixed';
  modal.style.top = '0';
  modal.style.left = '0';
  modal.style.width = '100vw';
  modal.style.height = '100vh';
  modal.style.background = 'rgba(0,0,0,0.25)';
  modal.style.display = 'flex';
  modal.style.alignItems = 'center';
  modal.style.justifyContent = 'center';
  modal.style.zIndex = '9999';
  modal.innerHTML = `
    <div style="background:#fff;padding:32px 36px;border-radius:14px;box-shadow:0 4px 24px rgba(44,62,80,0.13);min-width:340px;max-width:95vw;text-align:left;">
      <div style="font-size:1.15em;font-weight:600;margin-bottom:18px;text-align:center;">동아리 정보 수정</div>
      <div style="display:flex;flex-direction:column;gap:16px;">
        <label>동아리 이름<br><input id="editClubName" type="text" value="${post.club_name || ''}" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid #ccc;font-size:1em;"></label>
        <label>카테고리<br>
          <select id="editClubCategory" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid #ccc;font-size:1em;">
            ${categories.map(cat => `<option value="${cat.value}"${post.club_category===cat.value?' selected':''}>${cat.label}</option>`).join('')}
          </select>
        </label>
        <label>연락처<br><input id="editClubContact" type="text" value="${post.club_contact || ''}" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid #ccc;font-size:1em;"></label>
        <label>소개글<br><textarea id="editClubDesc" rows="4" style="width:100%;padding:8px 12px;border-radius:6px;border:1px solid #ccc;font-size:1em;">${post.club_desc || ''}</textarea></label>
      </div>
      <div style="display:flex;gap:18px;justify-content:center;margin-top:24px;">
        <button id="editClubSaveBtn" style="background:#23408e;color:#fff;padding:10px 28px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">수정</button>
        <button id="editClubCancelBtn" style="background:#e3eafc;color:#23408e;padding:10px 28px;border:none;border-radius:6px;font-weight:600;cursor:pointer;">취소</button>
      </div>
    </div>
  `;
  document.body.appendChild(modal);
  document.getElementById('editClubCancelBtn').onclick = () => { modal.remove(); };
  document.getElementById('editClubSaveBtn').onclick = async () => {
    const newName = document.getElementById('editClubName').value.trim();
    const newCategory = document.getElementById('editClubCategory').value;
    const newContact = document.getElementById('editClubContact').value.trim();
    const newDesc = document.getElementById('editClubDesc').value.trim();
    if (!newName || !newCategory || !newContact || !newDesc) {
      showSuccessToast('모든 항목을 입력하세요.');
      return;
    }
    const { error: updateError } = await supabase.from('clubs').update({
      club_name: newName,
      club_category: newCategory,
      club_contact: newContact,
      club_desc: newDesc
    }).eq('id', postId);
    if (updateError) {
      showSuccessToast('수정 실패: ' + updateError.message);
      return;
    }
    modal.remove();
    showSuccessToast('수정이 완료되었습니다!');
    setTimeout(() => location.reload(), 1200);
  };
}; 

// 디버깅을 위한 유틸리티 함수들
function debugAuthState() {
    console.log('=== 인증 상태 디버깅 ===');
    supabase.auth.getUser().then(({ data, error }) => {
        console.log('현재 사용자:', data.user);
        console.log('에러:', error);
    });
    
    supabase.auth.getSession().then(({ data, error }) => {
        console.log('현재 세션:', data.session);
        console.log('세션 에러:', error);
    });
}

function debugSupabaseConfig() {
    console.log('=== Supabase 설정 디버깅 ===');
    console.log('Supabase URL:', supabase.supabaseUrl);
    console.log('Supabase Key 존재:', !!supabase.supabaseKey);
    console.log('현재 URL:', window.location.origin);
    console.log('현재 경로:', window.location.pathname);
    console.log('전체 URL:', window.location.href);
}

function debugRedirectUrls() {
    console.log('=== 리다이렉트 URL 디버깅 ===');
    console.log('현재 origin:', window.location.origin);
    console.log('현재 pathname:', window.location.pathname);
    console.log('현재 href:', window.location.href);
    console.log('현재 hostname:', window.location.hostname);
    console.log('GitHub Pages 환경:', window.location.hostname.includes('github.io'));
    
    // GitHub Pages 환경 감지
    if (window.location.hostname.includes('github.io')) {
        console.log('GitHub Pages 환경 감지됨');
        console.log('설정된 리다이렉트 URL: https://rjsndksla.github.io');
    }
    
    console.log('예상 리다이렉트 URL:', window.location.origin + window.location.pathname);
    
    // 모든 페이지 URL들 출력
    const pages = [
        'index.html',
        'club.html', 
        'club-list.html',
        'club-register.html',
        'list.html',
        'register.html',
        'profile.html',
        'buyong.html'
    ];
    
    console.log('등록해야 할 리다이렉트 URL들:');
    if (window.location.hostname.includes('github.io')) {
        pages.forEach(page => {
            console.log(`https://rjsndksla.github.io/${page}`);
        });
    } else {
        pages.forEach(page => {
            console.log(`${window.location.origin}/${page}`);
        });
    }
}

async function debugClubDatabase() {
    console.log('=== 동아리 데이터베이스 디버깅 ===');
    
    try {
        // 모든 동아리 조회
        const { data: allClubs, error: allError } = await supabase
            .from('clubs')
            .select('*');
        
        console.log('전체 동아리 수:', allClubs?.length || 0);
        console.log('전체 동아리 데이터:', allClubs);
        
        if (allError) {
            console.error('동아리 조회 오류:', allError);
        }
        
        // 현재 사용자의 동아리만 조회
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
            const { data: userClubs, error: userError } = await supabase
                .from('clubs')
                .select('*')
                .eq('user_id', user.id);
            
            console.log('현재 사용자 동아리 수:', userClubs?.length || 0);
            console.log('현재 사용자 동아리:', userClubs);
            
            if (userError) {
                console.error('사용자 동아리 조회 오류:', userError);
            }
        }
        
        // 테이블 구조 확인
        const { data: tableInfo, error: tableError } = await supabase
            .from('clubs')
            .select('*')
            .limit(1);
        
        if (tableInfo && tableInfo.length > 0) {
            console.log('테이블 컬럼 구조:', Object.keys(tableInfo[0]));
        }
        
        if (tableError) {
            console.error('테이블 구조 확인 오류:', tableError);
        }
        
    } catch (error) {
        console.error('동아리 데이터베이스 디버깅 중 오류:', error);
    }
}

function debugUrlParams() {
    console.log('=== URL 파라미터 디버깅 ===');
    console.log('현재 URL:', window.location.href);
    console.log('URL 해시:', window.location.hash);
    console.log('URL 검색 파라미터:', window.location.search);
    
    // 해시 파라미터 파싱
    if (window.location.hash) {
        const params = new URLSearchParams(window.location.hash.substring(1));
        console.log('해시 파라미터:');
        for (const [key, value] of params.entries()) {
            console.log(`  ${key}: ${key.includes('token') ? '[HIDDEN]' : value}`);
        }
    }
    
    // 검색 파라미터 파싱
    if (window.location.search) {
        const params = new URLSearchParams(window.location.search);
        console.log('검색 파라미터:');
        for (const [key, value] of params.entries()) {
            console.log(`  ${key}: ${key.includes('token') ? '[HIDDEN]' : value}`);
        }
    }
}

// 전역 함수로 등록
window.debugAuthState = debugAuthState;
window.debugSupabaseConfig = debugSupabaseConfig;
window.debugRedirectUrls = debugRedirectUrls;
window.debugClubDatabase = debugClubDatabase;
window.debugUrlParams = debugUrlParams;

// URL에서 인증 토큰 파라미터 정리 함수
function cleanupAuthParams() {
    try {
        const url = new URL(window.location.href);
        const hash = url.hash;
        
        // URL 해시에서 인증 토큰 파라미터 확인
        if (hash && (hash.includes('access_token') || hash.includes('error'))) {
            console.log('인증 토큰 파라미터 발견, 정리 중...');
            
            // 해시 파라미터 파싱
            const params = new URLSearchParams(hash.substring(1));
            const accessToken = params.get('access_token');
            const error = params.get('error');
            
            if (accessToken) {
                console.log('액세스 토큰 발견');
                // 토큰을 Supabase에 전달
                supabase.auth.setSession({
                    access_token: accessToken,
                    refresh_token: params.get('refresh_token') || ''
                }).then(({ data, error }) => {
                    if (error) {
                        console.error('세션 설정 오류:', error);
                    } else {
                        console.log('세션 설정 성공');
                        // URL에서 토큰 파라미터 제거
                        window.history.replaceState({}, document.title, url.pathname);
                    }
                });
            } else if (error) {
                console.error('인증 오류:', error);
                alert('로그인 중 오류가 발생했습니다: ' + error);
                // URL에서 오류 파라미터 제거
                window.history.replaceState({}, document.title, url.pathname);
            }
        }
    } catch (error) {
        console.error('URL 파라미터 정리 중 오류:', error);
    }
}