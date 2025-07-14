// UI/이벤트/모달/폼/검색 등 프론트엔드 전용 코드만 남김

// 전역 변수
let currentPage = 0;
let isLoading = false;
let hasMoreData = true;
const itemsPerPage = 6;

// DOM이 로드된 후 실행
window.addEventListener('DOMContentLoaded', async function() {
    initializeDateFields();
    initializeFormListeners();
    initializeSearch();
    initializeAuthModal();
    await checkAuthState(); // 로그인 상태 확인

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

            const { data, error } = await supabase.auth.signUp({
                email: email,
                password: password
            });

            if (error) {
                alert('회원가입 실패: ' + error.message);
                return;
            }

            // 이메일 인증 안내 메시지
            alert('회원가입이 완료되었습니다! 이메일로 인증 링크가 발송되었습니다.\n메일을 확인하고 인증을 완료해 주세요. 인증 후 로그인할 수 있습니다.');
            this.reset();
            showLoginForm();
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
});

// 로그인 상태 확인 및 UI 업데이트
async function checkAuthState() {
    const { data: { user } } = await supabase.auth.getUser();
    const authContainer = document.getElementById('auth-container');
    const userInfo = document.getElementById('user-info');
    
    if (user) {
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
                        <a href="profile.html">내 프로필</a>
                        <a href="#" onclick="handleLogout()">로그아웃</a>
                    </div>
                </div>
            `;
        }
    } else {
        // 로그아웃 상태
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
        const { data: posts, error } = await supabase
            .from('posts')
            .select('*')
            .eq('user_id', userId)
            .order('created_at', { ascending: false });

        if (error) throw error;

        const postsGrid = document.getElementById('userPosts');
        if (!posts || posts.length === 0) {
            postsGrid.innerHTML = '<p class="no-posts">작성한 게시글이 없습니다.</p>';
            return;
        }

        postsGrid.innerHTML = posts.map(post => `
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
        `).join('');

        // 다른 메뉴가 열려있을 때 문서 클릭 시 닫기
        document.addEventListener('click', closeAllActionMenus);
    } catch (error) {
        console.error('게시글 로드 중 오류 발생:', error);
        document.getElementById('userPosts').innerHTML = '<p class="error-message">게시글을 불러오는 중 오류가 발생했습니다.</p>';
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

// 게시물 목록 표시 (필터 적용)
async function loadPosts() {
    try {
        const typeFilter = document.getElementById('typeFilter');
        const categoryFilter = document.getElementById('categoryFilter');
        const typeValue = typeFilter ? typeFilter.value : 'all';
        const categoryValue = categoryFilter ? categoryFilter.value : 'all';

        let posts = await getPosts();
        // 1차: 타입 필터
        if (typeValue !== 'all') {
            posts = posts.filter(post => post.type === typeValue);
        }
        // 2차: 카테고리 필터
        if (categoryValue !== 'all') {
            posts = posts.filter(post => post.category === categoryValue);
        }

        const itemsGrid = document.querySelector('.items-grid');
        if (!posts || posts.length === 0) {
            itemsGrid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1;">등록된 게시물이 없습니다.</p>';
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
        const itemsGrid = document.querySelector('.items-grid');
        itemsGrid.innerHTML = '<p style="text-align: center; color: #666; grid-column: 1 / -1;">게시물을 불러오는 중 오류가 발생했습니다.</p>';
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

// 게시물 상세보기
async function showPostDetail(postId) {
    try {
        const post = await getPostById(postId);
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
        alert('게시물을 불러오는 중 오류가 발생했습니다.');
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
} 

// 드롭다운 필터 이벤트 리스너 등록
window.addEventListener('DOMContentLoaded', function() {
    const typeFilter = document.getElementById('typeFilter');
    const categoryFilter = document.getElementById('categoryFilter');
    if (typeFilter) typeFilter.addEventListener('change', loadPosts);
    if (categoryFilter) categoryFilter.addEventListener('change', loadPosts);
}); 