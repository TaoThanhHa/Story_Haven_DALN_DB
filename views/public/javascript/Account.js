document.addEventListener("DOMContentLoaded", function () {
    const profileFullName = document.getElementById("profileFullName");
    const profileUsername = document.getElementById("profileUsername");
    const storyNameElement = document.getElementById("storyName");
    const storyCountElement = document.getElementById("storyCount");

    const followersCountDisplay = document.getElementById("followersCountDisplay");
    const followingCountDisplay = document.getElementById("followingCountDisplay");
    const followersCountInCard = document.getElementById("followersCountInCard");
    const followingCountInCard = document.getElementById("followingCountInCard");

    const followingUsersList = document.getElementById('followingUsersList');
    const noFollowingMessage = document.getElementById('noFollowingMessage');
    const followersUsersList = document.getElementById('followersUsersList');
    const noFollowersMessage = document.getElementById('noFollowersMessage');

    const cardFollowersHeaderClickable = document.getElementById("cardFollowersHeaderClickable");
    const cardFollowingHeaderClickable = document.getElementById("cardFollowingHeaderClickable");

    const workList = document.getElementById("workList");
    const publishedStoriesElement = document.getElementById("publishedStories");
    const draftStoriesElement = document.getElementById("draftStories");

    const commentForm = document.getElementById('commentForm');
    const commentInput = document.getElementById('commentInput');
    const commentsList = document.getElementById('comments');
    const successMessage = document.getElementById('successMessage');
    const errorMessage = document.getElementById('errorMessage');

    const tabs = document.querySelectorAll('.tab');
    const sections = document.querySelectorAll('.content__section');

    const editProfileForm = document.getElementById('editProfileForm');
    const settingsTab = document.getElementById('settingsTab');

    const profileMainAvatar = document.getElementById('profileMainAvatar');
    const navbarAvatarImg = document.getElementById('navbarAvatarImg');
    const avatarFileInput = document.getElementById('avatarFile');
    const avatarPreview = document.getElementById('avatarPreview');
    const descriptionTextarea = document.getElementById('description');
    const profileDescriptionContent = document.getElementById('profileDescriptionContent');

    const followButton = document.getElementById('followButton');

    let currentProfileUserId = null;
    let loggedInUserId = LOGGED_IN_USER_ID ? String(LOGGED_IN_USER_ID) : null;

    if (avatarFileInput) {
        avatarFileInput.addEventListener('change', function () {
            const file = this.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = function (e) {
                    avatarPreview.src = e.target.result;
                };
                reader.readAsDataURL(file);
            } else {
                avatarPreview.src = profileMainAvatar.src;
            }
        });
    }

    const getUserIdFromUrl = () => {
        const parts = window.location.pathname.split('/');
        return parts[1] === "account" ? parts[2] : null;
    };

    if (cardFollowersHeaderClickable) {
        cardFollowersHeaderClickable.style.cursor = 'pointer';
        cardFollowersHeaderClickable.addEventListener('click', () => {
            if (currentProfileUserId) window.location.href = `/account/${currentProfileUserId}/social?tab=followers`;
        });
    }

    if (cardFollowingHeaderClickable) {
        cardFollowingHeaderClickable.style.cursor = 'pointer';
        cardFollowingHeaderClickable.addEventListener('click', () => {
            if (currentProfileUserId) window.location.href = `/account/${currentProfileUserId}/social?tab=following`;
        });
    }

    // === Fetch stories ===
    const fetchStories = async (userId) => {
        try {
            const url = userId ? `/api/user/${userId}/stories` : '/api/storiesbyuser';
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) throw new Error("Không thể lấy danh sách truyện");
            const stories = await res.json();

            let publishedCount = 0, draftCount = 0;
            stories.forEach(s => s.status === 'published' ? publishedCount++ : draftCount++);

            publishedStoriesElement.textContent = publishedCount;
            draftStoriesElement.textContent = draftCount;
            storyCountElement.textContent = stories.length;

            workList.innerHTML = stories.length === 0 
                ? '<p class="text-muted text-center mt-3">Chưa có truyện nào.</p>' 
                : '';

            stories.forEach(story => {
                const workItem = document.createElement('div');
                workItem.classList.add('work-item');
                workItem.innerHTML = `
                    <a href="/story/${story._id}" class="story-thumbnail-link">
                        <img src="${story.thumbnail || '/images/default-thumbnail.png'}" alt="${story.title}">
                    </a>
                    <div class="work-info">
                        <a href="/story/${story._id}" class="story-title-link">
                            <h4>${story.title}</h4>
                        </a>
                        <p><i class="fas fa-eye"></i> 0 <i class="fas fa-star"></i> 0 <i class="fas fa-list"></i> 0</p>
                        <p class="work-summary">${story.description ? story.description.substring(0, 50) + '...' : 'No description'}</p>
                    </div>
                `;
                workList.appendChild(workItem);
            });
        } catch (err) {
            console.error(err);
            workList.innerHTML = '<p class="text-danger text-center mt-3">Lỗi khi tải truyện.</p>';
        }
    };

    const fetchFollowingUsers = async (userId) => {
        try {
            const res = await fetch(`/api/user/${userId}/following`);
            const data = await res.json();
            followingUsersList.innerHTML = '';
            if (!data.success || !data.following || data.following.length === 0) {
                noFollowingMessage.style.display = 'block';
                return;
            }
            noFollowingMessage.style.display = 'none';
            data.following.forEach(u => {
                const el = document.createElement('a');
                el.href = `/account/${u._id}`;
                el.classList.add('following-item');
                el.innerHTML = `<img src="${u.avatar || '/images/default-avatar.png'}" alt="Avatar"><span>${u.username}</span>`;
                followingUsersList.appendChild(el);
            });
        } catch (err) {
            console.error(err);
            noFollowingMessage.style.display = 'block';
            noFollowingMessage.textContent = 'Lỗi khi tải danh sách.';
        }
    };

    const fetchFollowersUsers = async (userId) => {
        try {
            const res = await fetch(`/api/user/${userId}/followers`);
            const data = await res.json();
            followersUsersList.innerHTML = '';
            if (!data.success || !data.followers || data.followers.length === 0) {
                noFollowersMessage.style.display = 'block';
                return;
            }
            noFollowersMessage.style.display = 'none';
            data.followers.forEach(u => {
                const el = document.createElement('a');
                el.href = `/account/${u._id}`;
                el.classList.add('following-item');
                el.innerHTML = `<img src="${u.avatar || '/images/default-avatar.png'}" alt="Avatar"><span>${u.username}</span>`;
                followersUsersList.appendChild(el);
            });
        } catch (err) {
            console.error(err);
            noFollowersMessage.style.display = 'block';
            noFollowersMessage.textContent = 'Lỗi khi tải danh sách.';
        }
    };

    // === Load profile ===
    async function loadProfile() {
        try {
            const userIdInUrl = getUserIdFromUrl();
            const isOwnProfile = loggedInUserId && loggedInUserId === (userIdInUrl || loggedInUserId);
            if (settingsTab) settingsTab.style.display = isOwnProfile ? "inline-block" : "none";

            const url = userIdInUrl ? `/api/account/${userIdInUrl}` : '/api/user/account-info';
            const res = await fetch(url, { credentials: "include" });
            if (!res.ok) return;

            const data = await res.json();
            const user = data.user || data;
            const profileUser = data.profileUser || data.user || data;
            currentProfileUserId = profileUser._id ? String(profileUser._id) : null;

            const avatarSrc = profileUser.avatar || "/images/default-avatar.png";
            if (profileMainAvatar) profileMainAvatar.src = avatarSrc;
            if (avatarPreview) avatarPreview.src = avatarSrc;
            if (profileDescriptionContent) profileDescriptionContent.textContent = profileUser.description || "Chưa có mô tả";
            if (profileFullName) profileFullName.textContent = profileUser.username || "Người dùng";
            if (profileUsername) profileUsername.textContent = profileUser.username || "username";
            if (storyNameElement) storyNameElement.textContent = profileUser.username || "username";
            if (isOwnProfile && navbarAvatarImg) navbarAvatarImg.src = avatarSrc;
            if (!isOwnProfile && followButton) {
                followButton.style.display = 'inline-block';
                followButton.textContent = data.isFollowing ? "Đã theo dõi" : "Theo dõi";
                followButton.classList.toggle('btn-success', data.isFollowing);
                followButton.classList.toggle('btn-primary', !data.isFollowing);
            } else if (followButton) followButton.style.display = 'none';

            if (followersCountDisplay) followersCountDisplay.textContent = data.followersCount || user.followers?.length || 0;
            if (followingCountDisplay) followingCountDisplay.textContent = data.followingCount || user.following?.length || 0;
            if (followersCountInCard) followersCountInCard.textContent = data.followersCount || user.followers?.length || 0;
            if (followingCountInCard) followingCountInCard.textContent = data.followingCount || user.following?.length || 0;

            fetchFollowingUsers(currentProfileUserId);
            fetchFollowersUsers(currentProfileUserId);
            fetchStories(currentProfileUserId);

            if (isOwnProfile && editProfileForm) {
                document.getElementById("name").value = user.name || user.username || "";
                document.getElementById("email").value = user.email || "";
                document.getElementById("phone").value = user.phonenumber || "";
                document.getElementById("description").value = user.description || "";
                avatarPreview.src = user.avatar || "/images/schwi.png";
            }

        } catch (err) {
            console.error("Lỗi loadProfile:", err);
        }
    }


    loadProfile();

    followButton.addEventListener('click', async () => {
        if (!loggedInUserId) return window.location.href = '/login';
        if (currentProfileUserId === loggedInUserId) return;

        try {
            const res = await fetch(`/api/user/${currentProfileUserId}/follow`, { method: 'POST', headers: { 'Content-Type': 'application/json' }});
            const data = await res.json();
            if (!data.success) return alert(data.error || 'Lỗi follow.');

            followButton.textContent = data.followed ? "Đã theo dõi" : "Theo dõi";
            followButton.classList.toggle('btn-success', data.followed);
            followButton.classList.toggle('btn-primary', !data.followed);

            let followers = parseInt(followersCountDisplay.textContent);
            followers = data.followed ? followers + 1 : followers - 1;
            followersCountDisplay.textContent = followers;
            if (followersCountInCard) followersCountInCard.textContent = followers;
            fetchFollowersUsers(currentProfileUserId);

        } catch (err) {
            console.error(err);
        }
    });

    // === Bình luận và phản hồi ===
    const usernames = ["Alice","Bob","Charlie","David","Eve","Schwi"];
    const avatars = ["/images/avt1.jpg","/images/avt2.jpg","/images/avt3.jpg","/images/schwi.png","/images/nền.jpg"];

    const generateId = () => Math.random().toString(36).substring(2,15) + Math.random().toString(36).substring(2,15);
    const getRandomUsername = () => usernames[Math.floor(Math.random()*usernames.length)];
    const getRandomAvatar = () => avatars[Math.floor(Math.random()*avatars.length)];

    function createReplyElement(replyText, username, avatar, date) {
        const reply = document.createElement("div");
        reply.classList.add("reply");
        reply.innerHTML = `
            <a href="#" class="avt"><img src="${avatar || getRandomAvatar()}" alt="Avatar"></a>
            <div class="comments-detail">
                <a href="#" class="nick-name">${username || getRandomUsername()}</a>
                <p class="comments-info">${replyText}</p>
                <div class="comments-item-meta">
                    <span class="comment-date">${date || new Date().toLocaleString()}</span>
                    <div class="comments-symbol">
                        <div class="delete-btn" style="color: red; cursor:pointer;"><i class="fas fa-trash"></i></div>
                    </div>
                </div>
            </div>
        `;
        reply.querySelector(".delete-btn").addEventListener("click", () => reply.remove());
        return reply;
    }

    function createCommentElement(commentText, username, avatar, date) {
        const commentId = generateId();
        const comment = document.createElement("li");
        comment.classList.add("comment-item");
        comment.dataset.commentId = commentId;
        comment.innerHTML = `
            <a href="#" class="avt"><img src="${avatar || getRandomAvatar()}" alt="Avatar"></a>
            <div class="comments-detail">
                <a href="#" class="nick-name">${username || getRandomUsername()}</a>
                <p class="comments-info">${commentText}</p>
                <div class="comments-item-meta">
                    <span class="comment-date">${date || new Date().toLocaleString()}</span>
                    <div class="comments-symbol">
                        <div class="reply-btn"><i class="fas fa-reply"></i> Phản hồi (<span class="reply-count">0</span>)</div>
                        <div class="delete-btn" style="color:red;cursor:pointer;"><i class="fas fa-trash"></i></div>
                    </div>
                </div>
                <div class="replies" id="replies-for-${commentId}"></div>
                <form class="reply-form" style="display:none;" data-comment-id="${commentId}">
                    <textarea placeholder="Nhập phản hồi..." required></textarea>
                    <button type="submit"><i class="fas fa-paper-plane"></i></button>
                </form>
            </div>
        `;
        const replyBtn = comment.querySelector(".reply-btn");
        const replyCount = comment.querySelector(".reply-count");
        const repliesContainer = comment.querySelector(".replies");
        const replyForm = comment.querySelector(".reply-form");
        const replyInput = replyForm.querySelector("textarea");
        const deleteBtn = comment.querySelector(".delete-btn");

        deleteBtn.addEventListener("click", () => comment.remove());

        replyBtn.addEventListener("click", () => {
            replyForm.style.display = replyForm.style.display === "none" ? "flex" : "none";
            if (replyForm.style.display === "flex") replyInput.focus();
        });

        replyForm.addEventListener("submit", (e) => {
            e.preventDefault();
            const text = replyInput.value.trim();
            if (!text) return;
            const el = createReplyElement(text, profileFullName.textContent, profileMainAvatar.src, new Date().toLocaleString());
            repliesContainer.appendChild(el);
            replyForm.style.display = "none";
            replyCount.textContent = parseInt(replyCount.textContent)+1;
            replyInput.value = "";
        });

        return comment;
    }

    commentForm.addEventListener("submit", (e) => {
        e.preventDefault();
        const text = commentInput.value.trim();
        if (!text) return;
        const el = createCommentElement(text, profileFullName.textContent, profileMainAvatar.src, new Date().toLocaleString());
        commentsList.prepend(el);
        commentInput.value = '';
        commentInput.style.height = 'auto';
    });

    commentInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
    });

    document.addEventListener('input', (e) => {
        if (e.target.matches('.reply-form textarea')) {
            e.target.style.height = 'auto';
            e.target.style.height = e.target.scrollHeight + 'px';
        }
    });

    tabs.forEach(tab => tab.addEventListener('click', () => {
        tabs.forEach(t=>t.classList.remove('tab--active'));
        sections.forEach(s=>s.classList.remove('content__section--active'));
        tab.classList.add('tab--active');
        document.getElementById(tab.dataset.tab)?.classList.add('content__section--active');
    }));
    document.querySelector('.tab[data-tab="gioithieu"]')?.click();

    // === Chỉnh sửa thông tin profile ===
    editProfileForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const fd = new FormData();
        fd.append('name', document.getElementById('name').value);
        fd.append('email', document.getElementById('email').value);
        fd.append('phone', document.getElementById('phone').value);
        fd.append('description', descriptionTextarea.value);
        const file = avatarFileInput.files[0];
        if (file) fd.append('avatarFile', file);

        try {
            const res = await fetch('/api/user/update-profile', { method: 'PUT', body: fd });
            const data = await res.json();
            if (res.ok && data.success) {
                successMessage.textContent = data.message || "Cập nhật thành công!";
                successMessage.style.display = 'block';
                errorMessage.style.display = 'none';
                loadProfile();
                setTimeout(()=>successMessage.style.display='none', 3000);
            } else {
                errorMessage.textContent = data.error || "Lỗi cập nhật.";
                errorMessage.style.display='block';
                successMessage.style.display='none';
            }
        } catch(err) {
            console.error(err);
            errorMessage.textContent = "Có lỗi xảy ra.";
            errorMessage.style.display='block';
            successMessage.style.display='none';
        }
    });
});
